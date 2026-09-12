export function resolveContent(existing: unknown, incoming: any): any {
	if (!incoming || !Array.isArray(incoming.changedPages)) return incoming;
	const base: any = typeof existing === "string" ? safeParse(existing) : (existing ?? {});
	const { changedPages, ...rest } = incoming;
	const merged: any = { ...base, ...rest };
	const pages: any[] = [...(Array.isArray(merged.pages) ? merged.pages : [])];
	for (const cp of changedPages) {
		if (!cp || typeof cp.index !== "number") continue;
		const prev = pages[cp.index] ?? { index: cp.index };
		// ponytail: object-level delta — merge changed/removed objects into the
		// stored canvasJson instead of replacing the whole page.
		if (cp.changedObjects && typeof prev.canvasJson === "string") {
			try {
				const parsed = JSON.parse(prev.canvasJson);
				mergeObjects(parsed, cp.changedObjects);
				const { changedObjects: _drop, canvasJson: _dropFull, ...fields } = cp;
				pages[cp.index] = { ...prev, ...fields, canvasJson: JSON.stringify(parsed) };
				continue;
			} catch {
				/* corrupt stored json — fall through to full replace */
			}
		}
		pages[cp.index] = { ...prev, ...cp };
	}
	merged.pages = pages;
	return merged;
}

// Mirror of frontend applyObjectDelta (kept local: backend tsc build can't
// import across packages). Keys match objectKey(): stable _selId, else idx:i.
function mergeObjects(parsed: any, delta: any): void {
	if (!parsed || !Array.isArray(parsed.objects)) parsed.objects = [];
	const key = (o: any, i: number) =>
		o && typeof o._selId === "string" && o._selId ? o._selId : `idx:${i}`;
	const reindex = () => {
		byKey.clear();
		parsed.objects.forEach((o: any, j: number) => byKey.set(key(o, j), j));
	};
	const byKey = new Map<string, number>();
	reindex();
	for (const r of delta?.removed ?? []) {
		const i = byKey.get(r);
		if (i !== undefined) {
			parsed.objects.splice(i, 1);
			reindex();
		}
	}
	for (const c of delta?.changed ?? []) {
		const i = byKey.get(key(c, -1));
		if (i !== undefined) parsed.objects[i] = c;
		else {
			byKey.set(key(c, parsed.objects.length), parsed.objects.length);
			parsed.objects.push(c);
		}
	}
}

function safeParse(s: string): any {
	try {
		return JSON.parse(s);
	} catch {
		return {};
	}
}
