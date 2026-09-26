import * as fabric from "fabric";
import type { LayoutConfig } from "../types/layout";
import { isFrameObject, styleFrame, nextFrameZ, isObjectLocked } from "./fabric-core";
import { DESIGN_W, DESIGN_H, layoutSlotTransform } from "./layout-engine";
import { resolveFrameForPhoto, allPhotoCandidates, resetCanvasInteractions, applyFrameClip } from "./photos";

const OVERLAY_KEY = "_dragOverlay";



fabric.config.NUM_FRACTION_DIGITS = 2;

function makeFrame(
  left: number,
  top: number,
  w: number,
  h: number,
  customProps: Record<string, any> = {},
): fabric.Rect {
  const obj = new fabric.Rect({ width: w, height: h, left, top, originX: "left", originY: "top" });
  obj.set({
    fill: "rgba(0,0,0,0.01)",
    stroke: "#000",
    strokeWidth: 1,
    strokeUniform: true,
    strokeDashArray: undefined,
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
  } as any);
  (obj as any).customProperties = { z: 0, layer: "frame", strokeWidth: 1, borderHidden: false, ...customProps };
  return obj;
}


function makeOverlayRect(left: number, top: number, w: number, h: number, angle: number = 0): fabric.Rect {
  const r = new fabric.Rect({
    left,
    top,
    width: w,
    height: h,
    originX: "left",
    originY: "top",
    fill: "rgba(200, 200, 200, 0.45)",
    stroke: "#aaa",
    strokeWidth: 1,
    strokeDashArray: [5, 4],
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    excludeFromExport: true,
    angle,
  });
  (r as any)[OVERLAY_KEY] = true;
  (r as any).customProperties = { z: 998, layer: "overlay" };
  return r;
}


function makeOverlayPlus(cx: number, cy: number): fabric.FabricText {
  const t = new fabric.FabricText("+", {
    left: cx,
    top: cy,
    fontSize: 26,
    fontFamily: "Inter, sans-serif",
    fill: "#888",
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    excludeFromExport: true,
  });
  (t as any)[OVERLAY_KEY] = true;
  (t as any).customProperties = { z: 998, layer: "overlay" };
  return t;
}


function makeOverlayLabel(cx: number, cy: number): fabric.FabricText {
  const t = new fabric.FabricText("Add a picture", {
    left: cx,
    top: cy + 14,
    fontSize: 9,
    fontFamily: "JetBrains Mono, monospace",
    fill: "#999",
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    excludeFromExport: true,
  });
  (t as any)[OVERLAY_KEY] = true;
  (t as any).customProperties = { z: 998, layer: "overlay" };
  return t;
}


// kind: "spread" | "single" -- which view the layout frame belongs to. Legacy frames (undefined) match both.
function kindMatches(o: any, kind?: string) {
  if (!kind) return true;
  const k = o.customProperties?.layoutKind;
  return k == null || k === kind;
}


export function toggleFrameBorder(canvas: fabric.Canvas, frame: fabric.FabricObject) {
  const cp = (frame as any).customProperties || {};
  (frame as any).customProperties = { ...cp, borderHidden: !cp.borderHidden };
  styleFrame(frame);
  canvas.requestRenderAll();
}


export function setFrameBorderWidth(canvas: fabric.Canvas, frame: fabric.FabricObject, width: number) {
  const cp = (frame as any).customProperties || {};
  (frame as any).customProperties = { ...cp, strokeWidth: Math.max(1, Math.min(5, width)), borderHidden: false };
  styleFrame(frame);
  canvas.requestRenderAll();
}




// ponytail: drop trượt viền 1px là miss → tha 6px canvas quanh bbox.
const HIT_TOLERANCE = 6;

type Pt = { x: number; y: number };

// ponytail: ray-casting even-odd — test góc khung tròn/sao/tam giác,
// khỏi false-positive như bbox (drop trúng góc trong-suốt vẫn fill).
function pointInPolygon(p: Pt, vs: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x,
      yi = vs[i].y,
      xj = vs[j].x,
      yj = vs[j].y;
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polygonVertices(w: number, h: number, sides: number): Pt[] {
  const cx = w / 2,
    cy = h / 2,
    r = Math.min(w, h) / 2,
    step = (2 * Math.PI) / sides,
    out: Pt[] = [];
  for (let i = 0; i < sides; i++) {
    const a = i * step - Math.PI / 2;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

function starVertices(w: number, h: number, points = 5, inner = 0.5): Pt[] {
  const cx = w / 2,
    cy = h / 2,
    outer = Math.min(w, h) / 2,
    ir = outer * inner,
    step = Math.PI / points,
    out: Pt[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : ir;
    const a = i * step - Math.PI / 2;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

// ponytail: test trong không gian path gốc (chưa scale) — cùng công thức vẽ ở shapes.ts.
// Trả null khi shape không test được (Heart/cong) → giữ bbox.
export function shapeContainsPoint(shapeName: string | undefined, w: number, h: number, lx: number, ly: number): boolean | null {
  switch (shapeName) {
    case "Circle": {
      const r = Math.min(w, h) / 2;
      const dx = (lx - w / 2) / (r || 1),
        dy = (ly - h / 2) / (r || 1);
      return dx * dx + dy * dy <= 1;
    }
    case "Ellipse": {
      const dx = (lx - w / 2) / (w / 2 || 1),
        dy = (ly - h / 2) / (h / 2 || 1);
      return dx * dx + dy * dy <= 1;
    }
    case "Triangle":
      return pointInPolygon({ x: lx, y: ly }, [
        { x: w / 2, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ]);
    case "Diamond":
      return pointInPolygon({ x: lx, y: ly }, [
        { x: w / 2, y: 0 },
        { x: w, y: h / 2 },
        { x: w / 2, y: h },
        { x: 0, y: h / 2 },
      ]);
    case "Pentagon":
      return pointInPolygon({ x: lx, y: ly }, polygonVertices(w, h, 5));
    case "Hexagon":
      return pointInPolygon({ x: lx, y: ly }, polygonVertices(w, h, 6));
    case "Octagon":
      return pointInPolygon({ x: lx, y: ly }, polygonVertices(w, h, 8));
    case "Star":
      return pointInPolygon({ x: lx, y: ly }, starVertices(w, h));
    default:
      return null;
  }
}

// ponytail: điểm canvas → không gian local của frame (kể cả lồng trong group, đã scale/xoay).
export function frameLocalPoint(frame: any, x: number, y: number): Pt | null {
  try {
    const m = frame.calcTransformMatrix();
    const inv = (fabric as any).util.invertTransform(m);
    const p = (fabric as any).util.transformPoint(new (fabric as any).Point(x, y), inv);
    return { x: p.x, y: p.y };
  } catch {
    return null;
  }
}
function frameContainsPoint(o: any, x: number, y: number): boolean {
  if ((o as fabric.FabricObject).containsPoint(new fabric.Point(x, y))) return true;
  const l = o.left || 0;
  const t = o.top || 0;
  const r = l + (o.width || 0) * (o.scaleX || 1);
  const b = t + (o.height || 0) * (o.scaleY || 1);
  return x >= l && x <= r && y >= t && y <= b;
}

// ponytail: searches inside groups too -- frame at any nesting depth is hit-testable.
// Group transforms map the canvas point into the group's local space before recursing.
export function hitTestFrame(canvas: fabric.Canvas, x: number, y: number): fabric.FabricObject | undefined {
  const objects = canvas.getObjects();
  for (let i = objects.length - 1; i >= 0; i--) {
    const found = searchFrameRecursive(objects[i], x, y);
    if (found) return found;
  }
  return undefined;
}

function searchFrameRecursive(obj: any, x: number, y: number): fabric.FabricObject | undefined {
  if (obj?.visible === false) return undefined;
  if ((obj?.type === "group" || obj?.type === "activeselection") && Array.isArray(obj._objects)) {
    const children = obj._objects as any[];
    for (let i = children.length - 1; i >= 0; i--) {
      const found = searchFrameRecursive(children[i], x, y);
      if (found) return found;
    }
    return undefined;
  }
  if (!isFrameObject(obj)) return undefined;
  // ponytail: absolute bbox first -- covers nested children with no toLocalPoint needed.
  // Bbox nới HIT_TOLERANCE để drop trượt viền vẫn khớp; khung có shape thì test
  // point-in-shape tiếp để loại góc trong-suốt (tròn/sao/tam giác...).
  if (typeof obj.getBoundingRect === "function") {
    try {
      const r = obj.getBoundingRect(true, true);
      if (
        x >= r.left - HIT_TOLERANCE &&
        x <= r.left + r.width + HIT_TOLERANCE &&
        y >= r.top - HIT_TOLERANCE &&
        y <= r.top + r.height + HIT_TOLERANCE
      ) {
        const shapeName = (obj as any).customProperties?.shapeName as string | undefined;
        if (shapeName) {
          const lp = frameLocalPoint(obj, x, y);
          const w = (obj as any).width || 0,
            h = (obj as any).height || 0;
          const inside = lp ? shapeContainsPoint(shapeName, w, h, lp.x, lp.y) : null;
          if (inside === false) return undefined;
        }
        return obj as fabric.FabricObject;
      }
    } catch {
      /* fall through to containsPoint */
    }
  }
  if (frameContainsPoint(obj, x, y)) return obj as fabric.FabricObject;
  return undefined;
}


export function removeDragOverlays(canvas: fabric.Canvas) {
  canvas
    .getObjects()
    .filter((o: any) => o[OVERLAY_KEY] === true)
    .forEach((o) => canvas.remove(o));
  canvas.renderAll();
}


// ponytail: absolute canvas-space rect -- frame.left/top are group-relative
// for frames inside a group, which put the old overlay at the top.
function absoluteRect(o: any): { left: number; top: number; width: number; height: number } {
  try {
    if (typeof o.getBoundingRect === "function") {
      const r = o.getBoundingRect(true, true);
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    }
  } catch {
    /* fall through */
  }
  const width = (o.width ?? 100) * (o.scaleX ?? 1);
  const height = (o.height ?? 100) * (o.scaleY ?? 1);
  return { left: o.left ?? 0, top: o.top ?? 0, width, height };
}

export function addFrameDragOverlays(canvas: fabric.Canvas) {
  // ponytail: inline removal to batch into single renderAll instead of two
  canvas
    .getObjects()
    .filter((o: any) => o[OVERLAY_KEY] === true)
    .forEach((o) => canvas.remove(o));
  const photos = allPhotoCandidates(canvas).filter((o: any) => o.customProperties?.layer === "photo");
  const visit = (obj: any) => {
    if (obj.customProperties?.layer === "frame") {
      const r = absoluteRect(obj);
      const hasPhoto = photos.some((p: any) => {
        if ((p as any).hasControls) return false;
        const pc = absoluteRect(p);
        const cx = pc.left + pc.width / 2,
          cy = pc.top + pc.height / 2;
        return cx >= r.left && cx <= r.left + r.width && cy >= r.top && cy <= r.top + r.height;
      });
      if (!hasPhoto) {
        canvas.add(makeOverlayRect(r.left, r.top, r.width, r.height, 0));
        canvas.add(makeOverlayPlus(r.left + r.width / 2, r.top + r.height / 2));
        canvas.add(makeOverlayLabel(r.left + r.width / 2, r.top + r.height / 2));
      }
    }
    if ((obj?.type === "group" || obj?.type === "activeselection") && Array.isArray(obj._objects)) {
      obj._objects.forEach(visit);
    }
  };
  canvas.getObjects().forEach(visit);
  canvas.renderAll();
}

// kind: "spread" | "single" -- which view the layout frame belongs to. Legacy frames (undefined) match both.

export function clearLayoutFrames(canvas: fabric.Canvas, predicate?: (o: any) => boolean, kind?: string) {
  const toRemove = canvas.getObjects().filter((o: any) => {
    if (!o.customProperties?.layoutFrame) return false;
    if (!kindMatches(o, kind)) return false;
    return predicate ? predicate(o) : true;
  });
  const removedIds = new Set(toRemove.map((o: any) => (o as any)._selId));
  toRemove.forEach((o) => canvas.remove(o));
  // remove photos that were locked into the cleared frames so they don't stay
  // baked onto the canvas after the layout changes
  if (removedIds.size) {
    canvas
      .getObjects()
      .filter(
        (o: any) =>
          o.customProperties?.layer === "photo" &&
          !(o as any).hasControls &&
          removedIds.has(o.customProperties?.frameId),
      )
      .forEach((o) => canvas.remove(o));
  }
}


export function showGuides(
  canvas: fabric.Canvas,
  layout: LayoutConfig,
  offsetX = 0,
  clearPredicate?: (o: any) => boolean,
  kind?: "single" | "spread",
  pageWidth?: number,
) {
  clearLayoutFrames(canvas, clearPredicate, kind);
  const cw = canvas.width || DESIGN_W;
  const ch = canvas.height || DESIGN_H;
  const spread = kind === "spread";
  const pw = pageWidth || (spread ? cw / 2 : cw);
  layout.slots.forEach((slot) => {
    const r = layoutSlotTransform(slot, { pageWidth: pw, pageHeight: ch, kind, offsetX });
    const frame = makeFrame(r.left, r.top, r.width, r.height, {
      layoutFrame: true,
      ...(kind ? { layoutKind: kind } : {}),
    });
    (frame as any)._selId = `layout-frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    (frame as any).customProperties.z = nextFrameZ(canvas);
    canvas.add(frame);
  });
  canvas.renderAll();
}

// Content is always visible in every view; L/R/2P only changes editing focus.
// The non-interactive side is greyed by an overlay + locked by applyInteractionLock.
// ponytail: removed the layoutKind visibility gating -- it made elements "disappear" on view switch.


// Fabric v7 loadFromJSON drops custom properties; re-apply them from the JSON data
// ponytail: use Fabric v7's built-in reviver instead of post-processing
// ponytail: loadFromJSON's reviver only fires for top-level objects -- group children
// would lose customProperties/_selId on every reload. Walk JSON + live side by side.
export function reviveDeep(jsonObjs: any[], liveObjs: any[]) {
  jsonObjs.forEach((o: any, i: number) => {
    const live = liveObjs[i];
    if (!live) return;
    reviveObject(o, live, null);
    if (Array.isArray(o.objects) && Array.isArray((live as any)._objects)) {
      reviveDeep(o.objects, (live as any)._objects);
    }
  });
}

export function reviveObject(o: any, object: any, _err: any) {
  if (!object) return;
  if (o.customProperties) (object as any).customProperties = o.customProperties;
  if (o._selId) (object as any)._selId = o._selId;
  if (o.customProperties?.layer === "photo") {
    object.set({ selectable: false, evented: false, hasControls: false, hasBorders: false } as any);
  }
  // ponytail: child locks don't serialize -- re-lock group children on every load,
  // otherwise a reloaded group lets children drift and breaks their clips.
  if (object.type === "group" && typeof object.getObjects === "function") {
    object.getObjects().forEach((c: any) => {
      c.set({
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        hasControls: false,
      } as any);
    });
  }
}



// Re-apply each photo's frame clip after a reload. Undo/redo snapshots can be
// taken while a photo is in edit mode (clipPath null), and reviveObject locks
// the photo back without restoring the clip -- leaving the frame unable to mask
// the photo overflow.
export function reclipPhotos(canvas: fabric.Canvas) {
  canvas.getObjects().forEach((o: any) => {
    if (o.customProperties?.layer !== "photo") return;
    const frame = resolveFrameForPhoto(canvas, o as fabric.FabricImage);
    if (!frame) return;
    applyFrameClip(frame, o as fabric.FabricImage);
  });
  canvas.requestRenderAll();
}


export function applyInteractionLock(
  canvas: fabric.Canvas,
  pageW: number,
  isCover: boolean,
  viewMode: "left" | "right" | "spread",
  enableAll = false,
) {
  if (isCover || viewMode === "spread") return;
  if (enableAll) {
    canvas.getObjects().forEach((o: any) => {
      // ponytail: skip locked photos so they don't become selectable during view-mode switch
      if ((o as any)._spine || (o as any).excludeFromExport) return;
      if ((o as any).customProperties?.layer === "photo" && !(o as any).hasControls) return;
      o.set({ selectable: true, evented: true, hasControls: true, hasBorders: true } as any);
    });
  }
  if (viewMode === "left") {
    canvas.getObjects().forEach((o: any) => {
      if ((o.left || 0) >= pageW)
        o.set({ selectable: false, evented: false, hasControls: false, hasBorders: false } as any);
    });
  } else {
    canvas.getObjects().forEach((o: any) => {
      if ((o.left || 0) < pageW)
        o.set({ selectable: false, evented: false, hasControls: false, hasBorders: false } as any);
    });
  }
}


// ponytail: grouped objects must leave via their group, canvas.remove can't reach them.
// ActiveSelection children ALSO carry .group -- only real groups route there.
function detachObject(canvas: fabric.Canvas, o: any) {
  if (o?.group && o.group.type === "group" && typeof o.group.remove === "function") o.group.remove(o);
  else canvas.remove(o);
}

export function deleteSelectedObjects(canvas: fabric.Canvas) {
	const sel = canvas.getActiveObjects().filter((a: any) => !isObjectLocked(a));
	if (!sel.length) return;
	sel.forEach((a: any) => {
		try {
			if (a._dragOverlay) return;
			if (isFrameObject(a)) {
				const frameId = (a as any)._selId;
				allPhotoCandidates(canvas)
					.filter((o: any) => o.customProperties?.layer === "photo" && o.customProperties?.frameId === frameId)
					.forEach((photo: any) => detachObject(canvas, photo));
			}
			if (a.customProperties?.layer === "photo") {
				resetCanvasInteractions(canvas);
				const fr: any = resolveFrameForPhoto(canvas, a);
				if (fr) {
					(fr as any).__savedEvented = undefined;
					fr.set({ evented: true, selectable: true, hasControls: true, hasBorders: true } as any);
				}
			}
			detachObject(canvas, a);
		} catch (err) {
			console.error("[delete] object removal failed", err);
		}
	});
	canvas.discardActiveObject();
	canvas.renderAll();
}
