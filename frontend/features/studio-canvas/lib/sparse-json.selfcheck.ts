// Self-check for sparse-json.ts. Run:
//   pnpm --filter backend exec tsx ../frontend/features/studio-canvas/lib/sparse-json.selfcheck.ts
import assert from "node:assert";
import {
  stripSparsePage,
  hydrateFabricObject,
  parsePageJson,
  diffPageObjects,
  applyObjectDelta,
  measureSparse,
} from "./sparse-json.js";

const densePage = {
  version: "7.4.0",
  width: 840,
  height: 1188,
  background: "#fff",
  objects: [
    {
      type: "rect",
      version: "7.4.0",
      originX: "left",
      originY: "top",
      left: 100,
      top: 120,
      width: 200,
      height: 150,
      fill: "rgba(0,0,0,0.01)",
      stroke: "#000",
      strokeWidth: 1,
      strokeDashArray: null,
      strokeLineCap: "butt",
      strokeLineJoin: "miter",
      strokeMiterLimit: 4,
      strokeUniform: false,
      strokeDashOffset: 0,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
      shadow: null,
      visible: true,
      backgroundColor: "",
      fillRule: "nonzero",
      paintFirst: "fill",
      globalCompositeOperation: "source-over",
      skewX: 0,
      skewY: 0,
      rx: 0,
      ry: 0,
      objectCaching: true,
      statefullCache: false,
      noScaleCache: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockScalingFlip: false,
      hasControls: true,
      hasBorders: true,
      selectable: true,
      evented: true,
      hoverCursor: null,
      moveCursor: null,
      centeredScaling: false,
      centeredRotation: true,
      absolutePositioned: false,
      cropX: 0,
      cropY: 0,
      crossOrigin: "",
      customProperties: { z: 50, layer: "frame" },
      _selId: "frame-1",
    },
    {
      type: "image",
      version: "7.4.0",
      originX: "center",
      originY: "center",
      left: 200.5,
      top: 195.25,
      width: 800,
      height: 600,
      scaleX: 0.3333333333,
      scaleY: 0.3333333333,
      src: "https://r2/photo.jpg",
      crossOrigin: "anonymous",
      cropX: 0,
      cropY: 0,
      filters: [],
      angle: 0,
      opacity: 1,
      visible: true,
      flipX: false,
      flipY: false,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      objectCaching: false,
      clipPath: {
        type: "rect",
        version: "7.4.0",
        originX: "left",
        originY: "top",
        left: 100,
        top: 120,
        width: 200,
        height: 150,
        absolutePositioned: true,
        objectCaching: false,
        visible: true,
        opacity: 1,
      },
      customProperties: { z: 49, layer: "photo", frameId: "frame-1" },
      _selId: "photo-1",
    },
    {
      type: "i-text",
      version: "7.4.0",
      originX: "left",
      originY: "top",
      left: 50,
      top: 60,
      width: 300,
      height: 40,
      text: "Hello",
      fontSize: 16,
      fontFamily: "Times New Roman",
      fontWeight: "normal",
      fontStyle: "normal",
      underline: false,
      overline: false,
      linethrough: false,
      textAlign: "left",
      lineHeight: 1.16,
      charSpacing: 0,
      textBackgroundColor: "",
      styles: {},
      fill: "rgb(0,0,0)",
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      opacity: 1,
      visible: true,
      customProperties: { z: 100, layer: "element" },
      _selId: "text-1",
    },
    {
      type: "path",
      version: "7.4.0",
      originX: "left",
      originY: "top",
      left: 10,
      top: 10,
      width: 120,
      height: 120,
      fill: "rgba(0,0,0,0.01)",
      stroke: "#000",
      strokeWidth: 2,
      path: [["M", 60.000000001, 0.005], ["L", 119.9999999, 60], ["L", 60, 120], ["Z"]],
      customProperties: { z: 51, layer: "frame", shapeName: "Diamond", shapeSize: 120 },
      _selId: "sframe-1",
    },
    {
      type: "group",
      version: "7.4.0",
      originX: "left",
      originY: "top",
      left: 0,
      top: 0,
      width: 400,
      height: 300,
      customProperties: { z: 200, layer: "element" },
      _selId: "group-1",
      objects: [
        {
          type: "rect",
          left: 5,
          top: 5,
          width: 50,
          height: 50,
          fill: "rgb(0,0,0)",
          visible: true,
          opacity: 1,
          customProperties: { z: 1, layer: "element" },
          _selId: "child-1",
        },
      ],
    },
  ],
};

const denseJson = JSON.stringify(densePage);

// 1. size reduction (Phase-0 style numbers)
const m = measureSparse(denseJson);
console.log(`sparse: ${m.before} -> ${m.after} bytes (${m.savedPct}% saved)`);
assert.ok(m.after < m.before, "sparse must shrink");
assert.ok(m.savedPct > 20, `expected >20% saved, got ${m.savedPct}%`);

// 2. strip keeps load-bearing keys
const stripped: any = JSON.parse(denseJson);
stripSparsePage(stripped);
const [rect, img, text, path, group] = stripped.objects;
assert.equal(img.src, "https://r2/photo.jpg", "src survives");
assert.equal(text.text, "Hello", "text survives");
assert.ok(img.clipPath, "clipPath survives");
assert.equal(img.clipPath.absolutePositioned, true, "non-default clip flag survives");
assert.ok(Array.isArray(path.path), "path data survives");
assert.equal(path.path[0][1], 60, "path floats rounded");
assert.equal(rect.fill, "rgba(0,0,0,0.01)", "transparent frame fill survives");
assert.ok(rect.customProperties && rect._selId === "frame-1", "identity survives");
assert.ok(!("filters" in img), "empty filters dropped");
assert.ok(!("fontFamily" in text), "default font stripped");
assert.ok(!("visible" in rect), "default visible stripped");
assert.equal(img.originX, "center", "non-default origin kept");
assert.equal(img.selectable, false, "non-default selectable kept");
assert.ok(group.objects[0]._selId === "child-1", "group children stripped recursively");
assert.ok(!("fill" in group.objects[0]), "default fill stripped in child");

// 3. strip -> hydrate round-trip is render-equivalent (numeric epsilon for
// intentional 2-decimal quantization; exact match for everything else)
function assertRenderEqual(a: unknown, b: unknown, path = ""): void {
  if (typeof a === "number" && typeof b === "number") {
    assert.ok(Math.abs(a - b) < 0.0051, `${path}: ${a} !== ${b}`);
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    assert.equal(a.length, b.length, `${path}.length`);
    a.forEach((v, i) => assertRenderEqual(v, b[i], `${path}[${i}]`));
    return;
  }
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
    // strip removes only table keys and hydrate re-adds all of them, so key
    // sets must match exactly — anything else means data loss or junk fill.
    assert.deepStrictEqual(Object.keys(a as object).sort(), Object.keys(b as object).sort(), `${path} keys`);
    for (const k of Object.keys(a as object)) {
      assertRenderEqual((a as any)[k], (b as any)[k], `${path}.${k}`);
    }
    return;
  }
  assert.strictEqual(a, b, path);
}
const revived: any = JSON.parse(JSON.stringify(stripped));
revived.objects.forEach(hydrateFabricObject);
const denseHydrated: any = JSON.parse(denseJson);
denseHydrated.objects.forEach(hydrateFabricObject);
// empty filters are dropped by design — normalize before comparing
const dropEmptyFilters = (o: any) => {
  if (Array.isArray(o)) return o.forEach(dropEmptyFilters);
  if (o && typeof o === "object") {
    if (Array.isArray((o as any).filters) && (o as any).filters.length === 0) delete (o as any).filters;
    Object.values(o).forEach(dropEmptyFilters);
  }
};
dropEmptyFilters(denseHydrated);
assertRenderEqual(revived.objects, denseHydrated.objects, "objects");

// 4. parsePageJson hydrates + warns on version mismatch
const parsed = parsePageJson(denseJson);
assert.equal(parsed.objects[2].fontFamily, "Times New Roman");
let warned = "";
const origWarn = console.warn;
console.warn = (s: string) => (warned = s);
parsePageJson(JSON.stringify({ ...JSON.parse(denseJson), version: "6.0.1" }));
console.warn = origWarn;
assert.ok(warned.includes("v6"), "version mismatch warns");

// 5. object diff + apply
const nextPage: any = JSON.parse(denseJson);
nextPage.objects[2].text = "World";
nextPage.objects.splice(0, 1); // remove frame rect
nextPage.objects.push({ type: "rect", left: 1, top: 2, width: 3, height: 4, _selId: "new-1" });
const nextJson = JSON.stringify(nextPage);
const d = diffPageObjects(denseJson, nextJson);
assert.equal(d.changed.length, 2, "text edit + added rect detected");
assert.deepStrictEqual(d.removed, ["frame-1"], "removed frame detected");
const merged: any = JSON.parse(denseJson);
stripSparsePage(merged);
applyObjectDelta(merged, d.changed as Record<string, unknown>[], d.removed);
const mergedHydrated = JSON.parse(JSON.stringify(merged));
mergedHydrated.objects.forEach(hydrateFabricObject);
const expectHydrated = parsePageJson(nextJson);
dropEmptyFilters(expectHydrated);
const keyOf = (o: any) => o._selId ?? `idx:${mergedHydrated.objects.indexOf(o)}`;
const byKey = new Map(expectHydrated.objects.map((o: any) => [o._selId, o]));
assert.equal(mergedHydrated.objects.length, expectHydrated.objects.length, "same object count");
mergedHydrated.objects.forEach((o: any) => {
  assert.ok(byKey.has(keyOf(o)), `object ${keyOf(o)} present`);
  assertRenderEqual(o, byKey.get(keyOf(o)), keyOf(o));
});

console.log("sparse-json: all assertions passed");
