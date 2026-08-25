import assert from "node:assert";
import { resolveContent } from "./merge-book-content.js";

const full = { version: 3, pages: [{ index: 0, canvasJson: "a" }] };
assert.strictEqual(resolveContent({ old: true }, full), full);

const existing = {
	version: 3,
	pageCount: 3,
	pages: [
		{ index: 0, canvasJson: "a", thumbnailUrl: null },
		{ index: 1, canvasJson: "b", thumbnailUrl: "u1" },
		{ index: 2, canvasJson: "c" },
	],
};
const merged = resolveContent(existing, {
	version: 3,
	pageCount: 3,
	changedPages: [{ index: 1, canvasJson: "B!", thumbnailUrl: "https://r2/x.jpg", layout: "grid", spreadLayout: null }],
});
assert.strictEqual(merged.pages.length, 3);
assert.strictEqual(merged.pages[1].canvasJson, "B!");
assert.strictEqual(merged.pages[1].thumbnailUrl, "https://r2/x.jpg");
assert.strictEqual(merged.pages[0].canvasJson, "a", "trang khác phải giữ nguyên");
assert.ok(!("changedPages" in merged), "không để rác changedPages trong DB");
assert.strictEqual(merged.version, 3);

const m2 = resolveContent(existing, { pageCount: 3, spineWidth: 42, changedPages: [] });
assert.strictEqual(m2.spineWidth, 42);
assert.strictEqual(m2.pageCount, 3);

const m3 = resolveContent(JSON.stringify(existing), { pageCount: 3, changedPages: [{ index: 0, canvasJson: "Z" }] });
assert.strictEqual(m3.pages[0].canvasJson, "Z");

assert.doesNotThrow(() => resolveContent(existing, { changedPages: [null, {}, { index: 9, canvasJson: "x" }] }));

console.log("merge-book-content: all assertions passed");
