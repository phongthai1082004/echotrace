import * as fabric from "fabric";
import type { LayoutConfig } from "../types/layout";
import type { PageState } from "../types";
import type { UndoEntry } from "../hooks/useCanvasState";
import { createClipPath } from "./shapes";

const MM_TO_PX = 4;

function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

const OVERLAY_KEY = "_dragOverlay";
const DIM_OVERLAY_KEY = "_dimOverlay";
const SERIALIZE_KEYS = ["z", "layer", "customProperties", "_selId", "selectable", "evented", "hasControls", "hasBorders"];

export function isFrameObject(obj: fabric.FabricObject): boolean {
  return (obj as any).customProperties?.layer === "frame";
}

export function enforceZLayers(canvas: fabric.Canvas) {
  const objs = canvas.getObjects().slice();
  objs.sort((a: any, b: any) => (a.customProperties?.z ?? 0) - (b.customProperties?.z ?? 0));
  objs.forEach((obj, i) => canvas.moveObjectTo(obj, i));
}

export function nextFrameZ(canvas: fabric.Canvas): number {
  const maxZ = canvas.getObjects().reduce((max: number, o: any) => {
    return o.customProperties?.layer === "frame" ? Math.max(max, o.customProperties?.z || 0) : max;
  }, 0);
  return Math.max(10, maxZ + 10);
}

export function serializeCanvasState(canvas: fabric.Canvas): string {
  const liveObjs = canvas.getObjects().filter((o: any) => !(o as any).excludeFromExport);
  const json = JSON.stringify((canvas as any).toJSON(SERIALIZE_KEYS));
  const parsed = JSON.parse(json);
  parsed.objects.forEach((o: any, i: number) => {
    const live = liveObjs[i];
    if (live) {
      o.customProperties = (live as any).customProperties;
      o._selId = (live as any)._selId;
    }
  });
  return JSON.stringify(parsed);
}

export function serializeSel(canvas: fabric.Canvas, obj: fabric.FabricObject): string {
  if (isFrameObject(obj)) {
    const photo = findPhotoInFrame(canvas, obj);
    if (photo) {
      const frameJson = (obj as any).toJSON(["z", "layer", "customProperties", "_selId"]);
      const photoJson = (photo as any).toJSON(["z", "layer", "customProperties", "_selId", "clipPath", "__frameLockScaleX", "__frameLockScaleY", "__photoLockScaleX", "__photoLockScaleY", "__frameOffsetX", "__frameOffsetY"]);
      return JSON.stringify({ _composite: true, frame: frameJson, photo: photoJson, frameSelId: (obj as any)._selId, photoFrameId: (photo as any).customProperties?.frameId });
    }
  }
  return JSON.stringify((obj as any).toJSON(["z", "layer", "customProperties", "_selId"]));
}

export function pasteClipboard(canvas: fabric.Canvas, clipboard: string, pasteCount: number, bumpPasteCount: () => void, pushUndo: () => void) {
  pushUndo();
  const parsed = JSON.parse(clipboard);
  if (parsed._composite) {
    fabric.util.enlivenObjects([parsed.frame]).then((arrF: any[]) => {
      fabric.util.enlivenObjects([parsed.photo]).then((arrP: any[]) => {
        const frame = arrF[0]; const photo = arrP[0];
        if (!frame || !photo) return;
        const off = 20 + pasteCount * 20;
        const selId = `frame-${Date.now()}`;
        frame.set({ left: (frame.left || 0) + off, top: (frame.top || 0) + off, customProperties: { ...frame.customProperties, z: Date.now() } } as any);
        (frame as any)._selId = selId;
        photo.set({ left: (photo.left || 0) + off, top: (photo.top || 0) + off, customProperties: { ...photo.customProperties, z: Date.now() - 1, frameId: selId } } as any);
        (photo as any)._selId = `photo-${Date.now()}`;
        canvas.add(frame); canvas.add(photo); canvas.setActiveObject(frame); canvas.renderAll(); enforceZLayers(canvas); bumpPasteCount();
      });
    });
  } else {
    const savedCp = parsed.customProperties, savedSelId = parsed._selId;
    fabric.util.enlivenObjects([parsed]).then((arr: any[]) => {
      const obj = arr[0]; if (!obj) return;
      const off = 20 + pasteCount * 20;
      obj.set({ left: (obj.left || 0) + off, top: (obj.top || 0) + off, customProperties: savedCp || { z: Date.now(), layer: "element" } } as any);
      if (savedSelId) (obj as any)._selId = savedSelId;
      (obj as any)._selId = `paste-${Date.now()}`;
      canvas.add(obj); canvas.setActiveObject(obj); canvas.renderAll(); enforceZLayers(canvas); bumpPasteCount();
    });
  }
}

export function hitTestFrame(canvas: fabric.Canvas, x: number, y: number): fabric.FabricObject | undefined {
  const frame = canvas.getObjects().find((o: any) => {
    if (!isFrameObject(o)) return false;
    return (o as fabric.FabricObject).containsPoint(new fabric.Point(x, y));
  });
  if (frame) return frame;
  const result = canvas.getObjects().find((o: any) => {
    if (!isFrameObject(o)) return false;
    const l = (o as any).left || 0;
    const t = (o as any).top || 0;
    const r = l + ((o as any).width || 0) * ((o as any).scaleX || 1);
    const b = t + ((o as any).height || 0) * ((o as any).scaleY || 1);
    return x >= l && x <= r && y >= t && y <= b;
  }) as fabric.FabricObject | undefined;
  return result;
}

function createRectPath(w: number, h: number): fabric.Rect {
  return new fabric.Rect({ width: w, height: h, originX: "left", originY: "top", left: 0, top: 0 });
}

function makeOverlayRect(left: number, top: number, w: number, h: number, angle: number = 0): fabric.Rect {
  const r = new fabric.Rect({
    left, top, width: w, height: h,
    originX: "left", originY: "top",
    fill: "rgba(200, 200, 200, 0.45)",
    stroke: "#aaa", strokeWidth: 1, strokeDashArray: [5, 4],
    selectable: false, evented: false, hasControls: false, hasBorders: false,
    excludeFromExport: true,
    angle,
  });
  (r as any)[OVERLAY_KEY] = true;
  (r as any).customProperties = { z: 998, layer: "overlay" };
  return r;
}

function makeOverlayPlus(cx: number, cy: number): fabric.FabricText {
  const t = new fabric.FabricText("+", {
    left: cx, top: cy,
    fontSize: 26, fontFamily: "Inter, sans-serif", fill: "#888",
    originX: "center", originY: "center",
    selectable: false, evented: false, hasControls: false, hasBorders: false,
    excludeFromExport: true,
  });
  (t as any)[OVERLAY_KEY] = true;
  (t as any).customProperties = { z: 998, layer: "overlay" };
  return t;
}

function makeOverlayLabel(cx: number, cy: number): fabric.FabricText {
  const t = new fabric.FabricText("Add a picture", {
    left: cx, top: cy + 14,
    fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: "#999",
    originX: "center", originY: "center",
    selectable: false, evented: false, hasControls: false, hasBorders: false,
    excludeFromExport: true,
  });
  (t as any)[OVERLAY_KEY] = true;
  (t as any).customProperties = { z: 998, layer: "overlay" };
  return t;
}

export function removeDragOverlays(canvas: fabric.Canvas) {
  canvas.getObjects().filter((o: any) => o[OVERLAY_KEY] === true).forEach((o) => canvas.remove(o));
  canvas.renderAll();
}

export function addFrameDragOverlays(canvas: fabric.Canvas) {
  // ponytail: inline removal to batch into single renderAll instead of two
  canvas.getObjects().filter((o: any) => o[OVERLAY_KEY] === true).forEach((o) => canvas.remove(o));
  canvas.getObjects().forEach((obj: any) => {
    if (obj.customProperties?.layer !== "frame") return;
    if (canvas.getObjects().some((o: any) => {
      if (o.customProperties?.layer !== "photo" || (o as any).hasControls) return false;
      // center origin: left/top are center
      return obj.containsPoint(new fabric.Point(o.left || 0, o.top || 0));
    })) return;
    const left = obj.left ?? 0, top = obj.top ?? 0;
    const w = (obj.width ?? 100) * (obj.scaleX ?? 1), h = (obj.height ?? 100) * (obj.scaleY ?? 1);
    const angle = obj.angle || 0;
    const center = obj.getCenterPoint();
    canvas.add(makeOverlayRect(left, top, w, h, angle));
    canvas.add(makeOverlayPlus(center.x, center.y));
    canvas.add(makeOverlayLabel(center.x, center.y));
  });
  canvas.renderAll();
}

export function clearLayoutFrames(canvas: fabric.Canvas, predicate?: (o: any) => boolean) {
  canvas.getObjects().filter((o: any) => {
    if (!o.customProperties?.layoutFrame) return false;
    return predicate ? predicate(o) : true;
  }).forEach((o) => canvas.remove(o));
}

function makeFrame(left: number, top: number, w: number, h: number, customProps: Record<string, any> = {}): fabric.Rect {
  const obj = new fabric.Rect({ width: w, height: h, left, top, originX: "left", originY: "top" });
  obj.set({
    fill: "rgba(0,0,0,0.01)", stroke: "#000", strokeWidth: 2, strokeDashArray: undefined,
    selectable: true, evented: true, hasControls: true, hasBorders: true,
  } as any);
  (obj as any).customProperties = { z: 0, layer: "frame", ...customProps };
  return obj;
}

function fitPhotoToFrame(frame: fabric.FabricObject, img: fabric.FabricImage) {
  const fw = (frame.width || 100) * (frame.scaleX || 1);
  const fh = (frame.height || 100) * (frame.scaleY || 1);
  const fl = frame.left || 0, ft = frame.top || 0;
  const imgW = img.width || 1, imgH = img.height || 1;
  const s = Math.max(fw / imgW, fh / imgH);
  const shapeName = (frame as any).customProperties?.shapeName;
  let clip;
  if (shapeName) {
    const size = (frame as any).customProperties?.shapeSize || fw;
    clip = createClipPath(shapeName, size, size);
    clip.set({ left: fl, top: ft, scaleX: frame.scaleX || 1, scaleY: frame.scaleY || 1, angle: frame.angle || 0 } as any);
  } else {
    clip = createRectPath(fw, fh);
    clip.set({ left: fl, top: ft, angle: frame.angle || 0, absolutePositioned: true, objectCaching: false } as any);
  }
  clip.setCoords();
  img.set({
    left: fl + fw / 2, top: ft + fh / 2,
    originX: "center", originY: "center",
    scaleX: s, scaleY: s,
    angle: 0,
    flipX: frame.flipX || false, flipY: frame.flipY || false,
    clipPath: clip,
    objectCaching: false,
  } as any);
  img.setCoords();
  img.dirty = true;
}

export function placePhotoInFrame(frame: fabric.FabricObject, img: fabric.FabricImage) {
  const canvas = (frame as any).canvas;
  if (canvas && findPhotoInFrame(canvas, frame)) return false;
  const frameZ = (frame as any).customProperties?.z ?? 50;
  fitPhotoToFrame(frame, img);
  // save baseline scales so movePhotoWithFrame doesn't double-count
  (img as any).__frameLockScaleX = frame.scaleX || 1;
  (img as any).__frameLockScaleY = frame.scaleY || 1;
  (img as any).__photoLockScaleX = img.scaleX || 1;
  (img as any).__photoLockScaleY = img.scaleY || 1;
  (img as any).__frameOffsetX = 0;
  (img as any).__frameOffsetY = 0;
  img.set({
    hasControls: false, hasBorders: false,
    lockMovementX: true, lockMovementY: true,
    lockScalingX: true, lockScalingY: true, lockRotation: true,
    selectable: false, evented: false,
    customProperties: { z: frameZ - 1, layer: "photo", frameId: (frame as any)._selId },
  } as any);
  (img as any)._selId = `photo-frame-${Date.now()}`;
  return true;
}

export function applyFrameClip(frame: fabric.FabricObject, img: fabric.FabricImage) {
  const fw = (frame.width || 100) * (frame.scaleX || 1);
  const fh = (frame.height || 100) * (frame.scaleY || 1);
  const fl = frame.left || 0, ft = frame.top || 0;
  const shapeName = (frame as any).customProperties?.shapeName;
  if (shapeName) {
    const size = (frame as any).customProperties?.shapeSize || fw;
    const clip = createClipPath(shapeName, size, size);
    clip.set({ left: fl, top: ft, scaleX: frame.scaleX || 1, scaleY: frame.scaleY || 1, angle: frame.angle || 0 } as any);
    clip.setCoords();
    img.set({ clipPath: clip } as any);
  } else {
    const clip = createRectPath(fw, fh);
    clip.set({ left: fl, top: ft, angle: frame.angle || 0, absolutePositioned: true, objectCaching: false } as any);
    clip.setCoords();
    img.set({ clipPath: clip } as any);
  }
  img.setCoords();
  img.dirty = true;
}

export function findPhotoInFrame(canvas: fabric.Canvas, frame: fabric.FabricObject): fabric.FabricImage | undefined {
  const frameId = (frame as any)._selId;
  if (frameId) {
    const photo = canvas.getObjects().find((o: any) =>
      o.customProperties?.frameId === frameId && !(o as any).hasControls
    ) as fabric.FabricImage | undefined;
    if (photo) return photo;
  }
  // fallback: only match orphan photos (no frameId) whose center is inside this frame
  return canvas.getObjects().find((o: any) => {
    if (o.customProperties?.layer !== "photo" || (o as any).hasControls) return false;
    if (o.customProperties?.frameId && o.customProperties.frameId !== frameId) return false;
    return frame.containsPoint(new fabric.Point(o.left || 0, o.top || 0));
  }) as fabric.FabricImage | undefined;
}

export function movePhotoWithFrame(frame: fabric.FabricObject, photo: fabric.FabricImage) {
  if ((photo as any).hasControls === true) return;
  const lockSX = (photo as any).__frameLockScaleX || 1;
  const lockSY = (photo as any).__frameLockScaleY || 1;
  const photoSX = (photo as any).__photoLockScaleX || photo.scaleX || 1;
  const photoSY = (photo as any).__photoLockScaleY || photo.scaleY || 1;
  const ratioX = (frame.scaleX || 1) / lockSX;
  const ratioY = (frame.scaleY || 1) / lockSY;
  // only scale photo when both axes change (corner/diagonal drag), not edge-only
  const uniform = Math.abs(ratioX / ratioY - 1) < 0.01;
  const sx = uniform ? photoSX * ratioX : photoSX;
  const sy = uniform ? photoSY * ratioY : photoSY;
  const rawOffX = (photo as any).__frameOffsetX || 0;
  const rawOffY = (photo as any).__frameOffsetY || 0;
  const offX = uniform ? rawOffX * ratioX : rawOffX;
  const offY = uniform ? rawOffY * ratioY : rawOffY;
  const fc = frame.getCenterPoint();
  const fw = (frame.width || 100) * (frame.scaleX || 1);
  const fh = (frame.height || 100) * (frame.scaleY || 1);
  const shapeName = (frame as any).customProperties?.shapeName;
  let clip;
  if (shapeName) {
    const size = (frame as any).customProperties?.shapeSize || fw;
    clip = createClipPath(shapeName, size, size);
    clip.set({ left: frame.left, top: frame.top, scaleX: frame.scaleX || 1, scaleY: frame.scaleY || 1, angle: frame.angle || 0 } as any);
  } else {
    clip = createRectPath(fw, fh);
    clip.set({ left: frame.left, top: frame.top, angle: frame.angle || 0, absolutePositioned: true, objectCaching: false } as any);
  }
  clip.setCoords();
  photo.set({ left: fc.x + offX, top: fc.y + offY, scaleX: sx, scaleY: sy, angle: frame.angle || 0, clipPath: clip } as any);
  photo.setCoords();
  photo.dirty = true;
}

export function resolveFrameForPhoto(canvas: fabric.Canvas, photo: fabric.FabricImage): fabric.FabricObject | undefined {
  const fid = (photo as any).customProperties?.frameId;
  if (fid) {
    const frame = canvas.getObjects().find((o: any) => isFrameObject(o) && (o as any)._selId === fid);
    if (frame) return frame;
  }
  const frame = canvas.getObjects().find((o: any) => {
    if (!isFrameObject(o)) return false;
    // center origin: photo.left/top are center
    return o.containsPoint(new fabric.Point(photo.left || 0, photo.top || 0));
  }) as fabric.FabricObject | undefined;
  if (frame) {
    (photo as any).customProperties = { ...(photo as any).customProperties, frameId: (frame as any)._selId };
  }
  return frame;
}

export function unlockPhotoInFrame(canvas: fabric.Canvas, photo: fabric.FabricImage) {
  const frame = resolveFrameForPhoto(canvas, photo);
  if (!frame) return;
  (photo as any).__savedZ = (photo as any).customProperties?.z;
  (photo as any).customProperties = { ...((photo as any).customProperties || {}), z: 998 };
  photo.set({
    clipPath: null,
    hasControls: true, hasBorders: true,
    lockMovementX: false, lockMovementY: false,
    lockScalingX: false, lockScalingY: false,
    lockRotation: false,
    selectable: true, evented: true,
    objectCaching: false,
  } as any);
  photo.setCoords();
  if (frame) {
    (frame as any).__savedEvented = frame.evented;
    (frame as any).__savedSelectable = frame.selectable;
  }
  // disable all other objects + rubber-band selection during edit mode
  canvas.selection = false;
  canvas.getObjects().forEach((o: any) => {
    if (o === photo) return;
    const cp = o.customProperties || {};
    cp.__savedEvented_all = o.evented;
    cp.__savedSelectable_all = o.selectable;
    cp.__savedControls_all = o.hasControls;
    cp.__savedBorders_all = o.hasBorders;
    o.customProperties = cp;
    o.set({ evented: false, selectable: false, hasControls: false, hasBorders: false } as any);
  });
  enforceZLayers(canvas);
  addPhotoDimOverlays(canvas, photo);
}

export function lockPhotoInFrame(canvas: fabric.Canvas, photo: fabric.FabricImage) {
  removePhotoDimOverlays(canvas);
  const savedZ = (photo as any).__savedZ;
  (photo as any).customProperties = { ...((photo as any).customProperties || {}), z: savedZ !== undefined ? savedZ : 0 };
  delete (photo as any).__savedZ;
  // restore all objects + rubber-band selection after edit mode
  canvas.selection = true;
  canvas.getObjects().forEach((o: any) => {
    const cp = o.customProperties;
    if (!cp || cp.__savedEvented_all === undefined) return;
    o.set({
      evented: cp.__savedEvented_all,
      selectable: cp.__savedSelectable_all,
      hasControls: cp.__savedControls_all,
      hasBorders: cp.__savedBorders_all,
    } as any);
    delete cp.__savedEvented_all;
    delete cp.__savedSelectable_all;
    delete cp.__savedControls_all;
    delete cp.__savedBorders_all;
    o.customProperties = cp;
  });
  const frame = resolveFrameForPhoto(canvas, photo);
  if (frame) {
    // save offset + scales for movePhotoWithFrame to preserve relative transform
    const fc = frame.getCenterPoint();
    (photo as any).__frameOffsetX = photo.left - fc.x;
    (photo as any).__frameOffsetY = photo.top - fc.y;
    (photo as any).__frameLockScaleX = frame.scaleX || 1;
    (photo as any).__frameLockScaleY = frame.scaleY || 1;
    (photo as any).__photoLockScaleX = photo.scaleX || 1;
    (photo as any).__photoLockScaleY = photo.scaleY || 1;
    applyFrameClip(frame, photo);
    frame.set({
      evented: (frame as any).__savedEvented !== undefined ? (frame as any).__savedEvented : true,
      selectable: (frame as any).__savedSelectable !== undefined ? (frame as any).__savedSelectable : true,
      hasControls: true, hasBorders: true,
    } as any);
  }
  photo.set({
    hasControls: false, hasBorders: false,
    lockMovementX: true, lockMovementY: true,
    lockScalingX: true, lockScalingY: true, lockRotation: true,
    selectable: false, evented: false,
  } as any);
  photo.setCoords();
  enforceZLayers(canvas);
}

export function addPhotoDimOverlays(canvas: fabric.Canvas, photo: fabric.FabricObject) {
  removePhotoDimOverlays(canvas);
  const cw = canvas.width || 1000, ch = canvas.height || 1000;
  const frame = resolveFrameForPhoto(canvas, photo as fabric.FabricImage);
  const target = frame || photo;
  target.setCoords();
  const center = target.getCenterPoint();
  const hw = ((target.width || 100) * (target.scaleX || 1)) / 2;
  const hh = ((target.height || 100) * (target.scaleY || 1)) / 2;
  const rad = ((target.angle || 0) * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const rel = [
    { x: -hw, y: -hh }, { x: hw, y: -hh },
    { x: hw, y: hh }, { x: -hw, y: hh },
  ];
  const corners = rel.map((c) => ({
    x: center.x + c.x * cos - c.y * sin,
    y: center.y + c.x * sin + c.y * cos,
  }));

  const pathData = `M 0 0 L ${cw} 0 L ${cw} ${ch} L 0 ${ch} Z M ${corners.map((c) => `${c.x} ${c.y}`).join(" L ")} Z`;
  const overlay = new fabric.Path(pathData, {
    fill: "rgba(128,128,128,0.55)", fillRule: "evenodd",
    selectable: false, evented: false, excludeFromExport: true,
  } as any);
  (overlay as any)[DIM_OVERLAY_KEY] = true;
  (overlay as any).customProperties = { z: 999, layer: "dimOverlay" };
  canvas.add(overlay);
  canvas.renderAll();
}

export function removePhotoDimOverlays(canvas: fabric.Canvas) {
  canvas.getObjects().filter((o: any) => o[DIM_OVERLAY_KEY] === true).forEach((o) => canvas.remove(o));
}

export function showGuides(canvas: fabric.Canvas, layout: LayoutConfig, offsetX = 0, clearPredicate?: (o: any) => boolean) {
  clearLayoutFrames(canvas, clearPredicate);
  layout.slots.forEach((slot) => {
    const left = mmToPx(slot.left) + offsetX, top = mmToPx(slot.top);
    const w = mmToPx(slot.width), h = mmToPx(slot.height);
    if (slot.role === "background") return;
    const frame = makeFrame(left, top, w, h, { layoutFrame: true });
    (frame as any)._selId = `layout-frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    (frame as any).customProperties.z = nextFrameZ(canvas);
    canvas.add(frame);
  });
  canvas.renderAll();
}

// Fabric v7 loadFromJSON drops custom properties; re-apply them from the JSON data
// ponytail: use Fabric v7's built-in reviver instead of post-processing
export function reviveObject(o: any, object: any, _err: any) {
  if (!object) return;
  if (o.customProperties) (object as any).customProperties = o.customProperties;
  if (o._selId) (object as any)._selId = o._selId;
  if (o.customProperties?.layer === "photo") {
    object.set({ selectable: false, evented: false, hasControls: false, hasBorders: false } as any);
  }
}

export function rehydrateCanvas(jsonStr: string, canvas: fabric.Canvas) {
  const parsed = JSON.parse(jsonStr);
  parsed.objects.forEach((objData: any, i: number) => {
    const live = canvas.getObjects()[i];
    reviveObject(objData, live, undefined);
  });
}

export function applyInteractionLock(canvas: fabric.Canvas, pageW: number, isCover: boolean, viewMode: "left" | "right" | "spread", enableAll = false) {
  if (isCover || viewMode === "spread") return;
  if (enableAll) {
    canvas.getObjects().forEach((o: any) => {
      // ponytail: skip locked photos so they don't become selectable during view-mode switch
      if ((o as any).customProperties?.layer === "photo" && !(o as any).hasControls) return;
      o.set({ selectable: true, evented: true, hasControls: true, hasBorders: true } as any);
    });
  }
  if (viewMode === "left") {
    canvas.getObjects().forEach((o: any) => { if ((o.left || 0) >= pageW) o.set({ selectable: false, evented: false, hasControls: false, hasBorders: false } as any); });
  } else {
    canvas.getObjects().forEach((o: any) => { if ((o.left || 0) < pageW) o.set({ selectable: false, evented: false, hasControls: false, hasBorders: false } as any); });
  }
}

export function isCoverPage(index: number, total: number): boolean {
  return index === 0 || index === total - 1 || total <= 2;
}

export function splitCanvasByMidpoint(jsonStr: string, midpoint: number): { leftJson: string; rightJson: string } {
  const parsed = JSON.parse(jsonStr);
  const leftObjs: any[] = [], rightObjs: any[] = [];
  parsed.objects?.forEach((o: any) => {
    if ((o.left || 0) < midpoint) { leftObjs.push(o); } else { o.left = (o.left || 0) - midpoint; rightObjs.push(o); }
  });
  const mkJson = (objs: any[]) => JSON.stringify({ ...parsed, objects: objs });
  return { leftJson: mkJson(leftObjs), rightJson: mkJson(rightObjs) };
}

export function canvasPointer(canvas: fabric.Canvas, clientX: number, clientY: number): { x: number; y: number } {
  const el = canvas.getElement();
  const rect = el.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (canvas.getWidth() / rect.width),
    y: (clientY - rect.top) * (canvas.getHeight() / rect.height),
  };
}

function cleanupUndo(canvas: fabric.Canvas) {
  canvas.discardActiveObject();
  removeDragOverlays(canvas);
  removePhotoDimOverlays(canvas);
  canvas.renderAll();
}

export function applyUndo(
  canvas: fabric.Canvas,
  popUndo: () => UndoEntry | undefined,
  pushRedoForCanvas: (entry: UndoEntry) => void,
  pushUndoPages: () => void,
  stateSnapshot: { pages: PageState[]; activePageIndex: number; activeLayout: any; viewMode: "left" | "right" | "spread" },
  setPage: (i: number, p: Partial<PageState>) => void,
  setPages: (p: PageState[]) => void,
  setActivePageIndex: (i: number) => void,
  setActiveLayout: (l: any) => void,
  setViewMode: (v: "left" | "right" | "spread") => void,
  pageCount: number,
) {
  const prev = popUndo();
  if (!prev) return;

  // Push redo entry based on type
  if (prev.type === "canvas") {
    pushRedoForCanvas({ type: "canvas", pageIdx: stateSnapshot.activePageIndex, canvasJson: serializeCanvasState(canvas) });
  } else {
    pushRedoForCanvas({ type: "pages", ...stateSnapshot });
  }

  cleanupUndo(canvas);

  if (prev.type === "canvas") {
    const { pageIdx, canvasJson } = prev;
    if (!isCoverPage(pageIdx, pageCount) && canvas.getWidth() > 400) {
      const { leftJson, rightJson } = splitCanvasByMidpoint(canvasJson, canvas.getWidth() / 2);
      setPage(pageIdx, { canvasJson: leftJson });
      setPage(Math.min(pageIdx + 1, pageCount - 1), { canvasJson: rightJson });
    } else {
      setPage(pageIdx, { canvasJson });
    }
    setActivePageIndex(pageIdx);
  } else {
    setPages(prev.pages);
    setActivePageIndex(prev.activePageIndex);
    if (prev.activeLayout) setActiveLayout(prev.activeLayout);
    if (prev.viewMode) setViewMode(prev.viewMode);
  }
}

export function applyRedo(
  canvas: fabric.Canvas,
  popRedo: () => UndoEntry | undefined,
  pushUndo: () => void,
  pushUndoPages: () => void,
  stateSnapshot: { pages: PageState[]; activePageIndex: number; activeLayout: any; viewMode: "left" | "right" | "spread" },
  setPage: (i: number, p: Partial<PageState>) => void,
  setPages: (p: PageState[]) => void,
  setActivePageIndex: (i: number) => void,
  setActiveLayout: (l: any) => void,
  setViewMode: (v: "left" | "right" | "spread") => void,
  pageCount: number,
) {
  const next = popRedo();
  if (!next) return;

  // Push undo entry based on type
  if (next.type === "canvas") {
    pushUndo();
  } else {
    pushUndoPages();
  }

  cleanupUndo(canvas);

  if (next.type === "canvas") {
    const { pageIdx, canvasJson } = next;
    if (!isCoverPage(pageIdx, pageCount) && canvas.getWidth() > 400) {
      const { leftJson, rightJson } = splitCanvasByMidpoint(canvasJson, canvas.getWidth() / 2);
      setPage(pageIdx, { canvasJson: leftJson });
      setPage(Math.min(pageIdx + 1, pageCount - 1), { canvasJson: rightJson });
    } else {
      setPage(pageIdx, { canvasJson });
    }
    setActivePageIndex(pageIdx);
  } else {
    setPages(next.pages);
    setActivePageIndex(next.activePageIndex);
    if (next.activeLayout) setActiveLayout(next.activeLayout);
    if (next.viewMode) setViewMode(next.viewMode);
  }
}
