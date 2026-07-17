import * as fabric from "fabric";

// each shape is a function that takes (w, h) and returns an SVG path string
function polygonPath(w: number, h: number, sides: number): string {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2;
  const step = (2 * Math.PI) / sides;
  let d = "";
  for (let i = 0; i < sides; i++) {
    const a = i * step - Math.PI / 2;
    d += (i === 0 ? "M" : "L") + ` ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  }
  return d + " Z";
}

function starPath(w: number, h: number, points: number, inner: number): string {
  const cx = w / 2, cy = h / 2, outer = Math.min(w, h) / 2, ir = outer * inner;
  const step = Math.PI / points;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : ir;
    const a = i * step - Math.PI / 2;
    d += (i === 0 ? "M" : "L") + ` ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  }
  return d + " Z";
}

export const FRAME_SHAPES: Record<string, (w: number, h: number) => string> = {
  Rectangle: (w, h) => `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`,
  RoundedRect: (w, h) => {
    const r = Math.min(w, h, 20);
    return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
  },
  Circle: (w, h) => {
    const r = Math.min(w, h) / 2;
    return `M ${w / 2 - r} ${h / 2} A ${r} ${r} 0 1 0 ${w / 2 + r} ${h / 2} A ${r} ${r} 0 1 0 ${w / 2 - r} ${h / 2} Z`;
  },
  Ellipse: (w, h) => `M 0 ${h / 2} A ${w / 2} ${h / 2} 0 1 0 ${w} ${h / 2} A ${w / 2} ${h / 2} 0 1 0 0 ${h / 2} Z`,
  Triangle: (w, h) => `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`,
  Pentagon: (w, h) => polygonPath(w, h, 5),
  Hexagon: (w, h) => polygonPath(w, h, 6),
  Octagon: (w, h) => polygonPath(w, h, 8),
  Diamond: (w, h) => `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`,
  Star: (w, h) => starPath(w, h, 5, 0.5),
  Heart: (w, h) => {
    const cx = w / 2, bh = h * 0.65;
    return `M ${cx} ${h} C ${cx * 0.15} ${bh} 0 ${h * 0.35} ${cx * 0.25} ${h * 0.2} C ${cx * 0.4} ${h * 0.05} ${cx * 0.7} ${h * 0.05} ${cx} ${h * 0.25} C ${cx * 1.3} ${h * 0.05} ${cx * 1.6} ${h * 0.05} ${cx * 1.75} ${h * 0.2} C ${w} ${h * 0.35} ${cx * 1.85} ${bh} ${cx} ${h} Z`;
  },

};

export type ShapeName = keyof typeof FRAME_SHAPES;
export const SHAPE_NAMES = Object.keys(FRAME_SHAPES) as ShapeName[];

export function createFramePath(shapeName: ShapeName, w: number, h: number): fabric.Path {
  const pathStr = FRAME_SHAPES[shapeName](w, h);
  return new fabric.Path(pathStr, {
    left: 0, top: 0, originX: "left", originY: "top",
    fill: "rgba(0,0,0,0.01)", stroke: "#000", strokeWidth: 2,
    selectable: true, evented: true, hasControls: true, hasBorders: true,
    objectCaching: false,
    absolutePositioned: false,
  } as any);
}

export function createClipPath(shapeName: ShapeName, w: number, h: number): fabric.Path {
  const pathStr = FRAME_SHAPES[shapeName](w, h);
  const clip = new fabric.Path(pathStr, {
    left: 0, top: 0, originX: "left", originY: "top",
    absolutePositioned: true, objectCaching: false,
  } as any);
  clip.setCoords();
  return clip;
}

let _sid = 0;
export function makeShapeFrame(shapeName: ShapeName, left: number, top: number, size: number = 120): fabric.Path {
  const obj = createFramePath(shapeName, size, size);
  obj.set({ left, top } as any);
  obj.setCoords();
  (obj as any)._selId = `sframe-${Date.now()}-${++_sid}`;
  (obj as any).customProperties = { z: 0, layer: "frame", shapeName, shapeSize: size };
  return obj;
}
