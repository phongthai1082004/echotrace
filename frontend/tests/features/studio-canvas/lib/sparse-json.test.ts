// F41: Studio sparse-json — strip/apply round-trip (folds sparse-json.selfcheck.ts in).
import {
  stripSparsePage,
  hydrateFabricObject,
  parsePageJson,
  diffPageObjects,
  applyObjectDelta,
  measureSparse,
} from "@/features/studio-canvas/lib/sparse-json";

const rect = (over: Record<string, unknown> = {}) => ({
  type: "rect",
  version: "7.4.0",
  originX: "left",
  originY: "top",
  left: 100,
  top: 120,
  width: 200,
  height: 150,
  fill: "rgb(0,0,0)",
  visible: true,
  opacity: 1,
  customProperties: { z: 50 },
  _selId: "frame-1",
  ...over,
});

const densePage = () => ({
  version: "7.4.0",
  width: 840,
  height: 1188,
  objects: [
    rect(),
    { type: "i-text", version: "7.4.0", text: "Hello", fontSize: 16, fontFamily: "Times New Roman", visible: true, _selId: "text-1" },
    { type: "image", version: "7.4.0", src: "https://r2/photo.jpg", filters: [], visible: true, _selId: "photo-1" },
  ],
});

it("F41 sparse shrinks dense JSON (selfcheck §1)", () => {
  const m = measureSparse(JSON.stringify(densePage()));
  expect(m.after).toBeLessThan(m.before);
  expect(m.savedPct).toBeGreaterThan(10);
});

it("F41 strip keeps load-bearing keys, drops defaults (selfcheck §2)", () => {
  const p: any = densePage();
  stripSparsePage(p);
  const [r, t, img] = p.objects;
  expect(r._selId).toBe("frame-1");
  expect(r.customProperties).toEqual({ z: 50 });
  expect(t.text).toBe("Hello");
  expect(img.src).toBe("https://r2/photo.jpg");
  expect(img).not.toHaveProperty("filters"); // empty chain dropped
  expect(t).not.toHaveProperty("fontFamily"); // default stripped
  expect(r).not.toHaveProperty("visible"); // default stripped
});

it("F41 strip→hydrate round-trip is render-equivalent (selfcheck §3)", () => {
  const dense = JSON.parse(JSON.stringify(densePage()));
  const stripped: any = JSON.parse(JSON.stringify(densePage()));
  stripSparsePage(stripped);
  stripped.objects.forEach(hydrateFabricObject);
  dense.objects.forEach(hydrateFabricObject);
  // empty filters are dropped by design — normalize before comparing
  for (const o of dense.objects) if (Array.isArray(o.filters) && o.filters.length === 0) delete o.filters;
  expect(stripped.objects).toEqual(dense.objects);
});

it("F41 parsePageJson hydrates + warns on fabric-major mismatch (selfcheck §4)", () => {
  const parsed = parsePageJson(JSON.stringify(densePage()));
  expect(parsed.objects[1].fontFamily).toBe("Times New Roman");
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  parsePageJson(JSON.stringify({ ...densePage(), version: "6.0.1" }));
  expect(warn).toHaveBeenCalledWith(expect.stringContaining("v6"));
  warn.mockRestore();
  expect(parsePageJson("{broken")).toBeNull();
  expect(parsePageJson(null)).toBeNull();
});

it("F41 diff detects edit/add/remove by _selId; apply merges (selfcheck §5)", () => {
  const prev = JSON.stringify(densePage());
  const next: any = densePage();
  next.objects[1].text = "World";
  next.objects.splice(0, 1); // remove frame-1
  next.objects.push({ type: "rect", left: 1, top: 2, width: 3, height: 4, _selId: "new-1" });
  const d = diffPageObjects(prev, JSON.stringify(next));
  expect(d.changed).toHaveLength(2);
  expect(d.removed).toEqual(["frame-1"]);
  const merged: any = JSON.parse(prev);
  applyObjectDelta(merged, d.changed, d.removed);
  const keys = merged.objects.map((o: any) => o._selId).sort();
  expect(keys).toEqual(["new-1", "photo-1", "text-1"]);
  expect(merged.objects.find((o: any) => o._selId === "text-1").text).toBe("World");
});

it("F41 diff junk changedObjects dropped: identical pages diff empty", () => {
  const j = JSON.stringify(densePage());
  const d = diffPageObjects(j, j);
  expect(d).toEqual({ changed: [], removed: [] });
});
