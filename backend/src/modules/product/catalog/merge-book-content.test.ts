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

// object-level delta: merge changed/removed into stored canvasJson, drop the delta key
const objExisting = {
	version: 3,
	pages: [
		{
			index: 0,
			canvasJson: JSON.stringify({
				version: "7.4",
				objects: [
					{ type: "rect", left: 1, _selId: "keep" },
					{ type: "rect", left: 2, _selId: "edit" },
					{ type: "rect", left: 3, _selId: "del" },
				],
			}),
		},
	],
};
const m4 = resolveContent(objExisting, {
	changedPages: [
		{
			index: 0,
			changedObjects: {
				changed: [{ type: "rect", left: 22, _selId: "edit" }],
				removed: ["del"],
			},
		},
	],
});
const m4objs = JSON.parse(m4.pages[0].canvasJson).objects;
assert.strictEqual(m4objs.length, 2, "removed object dropped");
assert.strictEqual(m4objs.find((o: any) => o._selId === "edit").left, 22, "changed object merged");
assert.strictEqual(m4objs.find((o: any) => o._selId === "keep").left, 1, "untouched object kept");
assert.ok(!("changedObjects" in m4.pages[0]), "không để rác changedObjects trong DB");

// corrupt stored json falls back to full replace
const m5 = resolveContent({ pages: [{ index: 0, canvasJson: "{oops" }] }, {
	changedPages: [{ index: 0, canvasJson: "FULL", changedObjects: { changed: [], removed: [] } }],
});
assert.strictEqual(m5.pages[0].canvasJson, "FULL");

console.log("merge-book-content: all assertions passed");
