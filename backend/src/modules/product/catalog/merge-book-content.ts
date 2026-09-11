export function resolveContent(existing: unknown, incoming: any): any {
	if (!incoming || !Array.isArray(incoming.changedPages)) return incoming;
	const base: any = typeof existing === "string" ? safeParse(existing) : (existing ?? {});
	const { changedPages, ...rest } = incoming;
	const merged: any = { ...base, ...rest };
	const pages: any[] = [...(Array.isArray(merged.pages) ? merged.pages : [])];
	for (const cp of changedPages) {
		if (!cp || typeof cp.index !== "number") continue;
		pages[cp.index] = { ...(pages[cp.index] ?? { index: cp.index }), ...cp };
	}
	merged.pages = pages;
	return merged;
}

function safeParse(s: string): any {
	try {
		return JSON.parse(s);
	} catch {
		return {};
	}
}
