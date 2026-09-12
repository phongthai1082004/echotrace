// Bandwidth demo: dense-full vs sparse+delta on a sample page.
// Run: pnpm --filter backend exec tsx ../frontend/features/studio-canvas/lib/sparse-json.demo.ts
import { stripSparsePage, diffPageObjects, parsePageJson } from "./sparse-json.js";
import { serializePage } from "./book-content.js";

function photo(id: string, left: number, top: number) {
  return {
    type: "image", version: "7.4.0", originX: "center", originY: "center",
    left, top, width: 1200, height: 800, scaleX: 0.25, scaleY: 0.25,
    src: `https://r2/${id}.jpg`, crossOrigin: "anonymous", cropX: 0, cropY: 0,
    filters: [], angle: 0, opacity: 1, visible: true, flipX: false, flipY: false,
    selectable: false, evented: false, hasControls: false, hasBorders: false,
    lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true,
    lockRotation: true, objectCaching: false, fill: "rgb(0,0,0)", stroke: null,
    globalCompositeOperation: "source-over", statefullCache: false, noScaleCache: true,
    clipPath: {
      type: "rect", version: "7.4.0", originX: "left", originY: "top",
      left: left - 75, top: top - 50, width: 150, height: 100,
      absolutePositioned: true, objectCaching: false, visible: true, opacity: 1,
      scaleX: 1, scaleY: 1, angle: 0, fill: "rgb(0,0,0)",
    },
    customProperties: { z: 10, layer: "photo", frameId: `frame-${id}` },
    _selId: `photo-${id}`,
  };
}
function frame(id: string, left: number, top: number) {
  return {
    type: "rect", version: "7.4.0", originX: "left", originY: "top",
    left, top, width: 150, height: 100, fill: "rgba(0,0,0,0.01)",
    stroke: "#000", strokeWidth: 1, scaleX: 1, scaleY: 1, angle: 0,
    opacity: 1, visible: true, selectable: true, evented: true,
    hasControls: true, hasBorders: true, objectCaching: true,
    customProperties: { z: 11, layer: "frame" }, _selId: `frame-${id}`,
  };
}
function text(id: string, str: string) {
  return {
    type: "i-text", version: "7.4.0", originX: "left", originY: "top",
    left: 50, top: 600, width: 400, height: 40, text: str,
    fontSize: 24, fontFamily: "Space Grotesk", fontWeight: "bold",
    underline: false, textAlign: "left", lineHeight: 1.16, charSpacing: 0,
    fill: "#222222", scaleX: 1, scaleY: 1, angle: 0, opacity: 1, visible: true,
    customProperties: { z: 20, layer: "element" }, _selId: `text-${id}`,
  };
}

const objects: any[] = [text("t1", "Our summer trip")];
for (let i = 0; i < 5; i++) {
  objects.push(frame(`f${i}`, 60 + i * 160, 80), photo(`f${i}`, 135 + i * 160, 130));
}
objects.push(text("t2", "Made with love"));
const dense = JSON.stringify({ version: "7.4.0", width: 1680, height: 1188, background: "#fff", objects });

// OLD way: full dense page + full elements
const denseParsed: any = JSON.parse(dense);
const elementsFull = JSON.stringify(serializePage(dense, 0)?.elements ?? []);
const oldFull = dense.length + elementsFull.length;

// NEW way, no edit yet: sparse full page + elements
const sparseParsed: any = JSON.parse(dense);
stripSparsePage(sparseParsed);
const sparseFull = JSON.stringify(sparseParsed);
const newFull = sparseFull.length + elementsFull.length;

console.log(`page: ${objects.length} objects (${dense.length}B dense canvasJson, ${elementsFull.length}B elements)`);
console.log(`OLD full save : ${oldFull}B`);
console.log(`NEW full save : ${newFull}B  (-${Math.round((1 - newFull / oldFull) * 100)}%)`);

function scenario(name: string, mutate: (p: any) => void) {
  const next: any = JSON.parse(dense);
  mutate(next);
  const nextJson = JSON.stringify(next);
  const d = diffPageObjects(dense, nextJson);
  const nextCount = parsePageJson(nextJson)?.objects?.length ?? 0;
  const useDelta = d.removed.length + d.changed.length < nextCount;
  const sent = useDelta
    ? JSON.stringify({ changedObjects: d }).length + elementsFull.length
    : newFull;
  const old = oldFull;
  console.log(
    `${name}: OLD ${old}B -> NEW ${sent}B (-${Math.round((1 - sent / old) * 100)}%)` +
      (useDelta ? `  [delta: ${d.changed.length} changed, ${d.removed.length} removed]` : `  [full sparse: delta not worth it]`),
  );
}

scenario("edit 1 text       ", (p) => (p.objects[0].text = "Our winter trip"));
scenario("move 1 photo      ", (p) => ((p.objects[2].left += 30), (p.objects[2].top += 15)));
scenario("delete 1 frame    ", (p) => p.objects.splice(1, 2));
scenario("restyle 10 objects", (p) => p.objects.forEach((o: any, i: number) => i < 10 && (o.angle = (o.angle || 0) + 5)));
