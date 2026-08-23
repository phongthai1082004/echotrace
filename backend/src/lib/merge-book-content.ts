/**
 * Partial sync cho book content.
 *
 * Client autosave gửi `changedPages: [{ index, canvasJson, thumbnailUrl, layout, spreadLayout }]`
 * thay vì mảng `pages` đầy đủ để tránh upload lại cả quyển mỗi tick.
 * Content có `pages` (full sync) đi qua nguyên vẹn — back-compat với mọi caller cũ.
 * Shape sau merge luôn là `{ ..., pages: [...] }` như cũ nên loader/cart không cần biết.
 */
export function resolveContent(existing: unknown, incoming: any): any {
	if (!incoming || !Array.isArray(incoming.changedPages)) return incoming;
	const base: any = typeof existing === "string" ? safeParse(existing) : (existing ?? {});
	const { changedPages, ...rest } = incoming;
	// key khác (version, pageCount, paperSize, ...) của incoming đè lên existing
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
