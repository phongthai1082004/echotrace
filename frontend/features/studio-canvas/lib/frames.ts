import * as fabric from "fabric";
import type { LayoutConfig } from "../types/layout";
import { createClipPath } from "./shapes";
import { isFrameObject, styleFrame, enforceZLayers, nextFrameZ } from "./fabric-core";
import { DESIGN_W, DESIGN_H, layoutSlotTransform } from "./layout-engine";

const OVERLAY_KEY = "_dragOverlay";

const DIM_OVERLAY_KEY = "_dimOverlay";



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


function createRectPath(w: number, h: number): fabric.Rect {
  return new fabric.Rect({ width: w, height: h, originX: "left", originY: "top", left: 0, top: 0 });
}


function fitPhotoToFrame(frame: fabric.FabricObject, img: fabric.FabricImage) {
  const fw = (frame.width || 100) * (frame.scaleX || 1);
  const fh = (frame.height || 100) * (frame.scaleY || 1);
  const fl = frame.left || 0,
    ft = frame.top || 0;
  const imgW = img.width || 1,
    imgH = img.height || 1;
  // ponytail: cover — image fills the frame edge to edge; the clipPath keeps it from spilling
  const s = Math.max(fw / imgW, fh / imgH);
  const shapeName = (frame as any).customProperties?.shapeName;
  let clip;
  if (shapeName) {
    const size = (frame as any).customProperties?.shapeSize || fw;
    clip = createClipPath(shapeName, size, size);
    clip.set({
      left: fl,
      top: ft,
      scaleX: frame.scaleX || 1,
      scaleY: frame.scaleY || 1,
      angle: frame.angle || 0,
    } as any);
  } else {
    clip = createRectPath(fw, fh);
    clip.set({ left: fl, top: ft, angle: frame.angle || 0, absolutePositioned: true, objectCaching: false } as any);
  }
  clip.setCoords();
  const fc = frame.getCenterPoint();
  img.set({
    left: fc.x,
    top: fc.y,
    originX: "center",
    originY: "center",
    scaleX: s,
    scaleY: s,
    angle: frame.angle || 0,
    flipX: frame.flipX || false,
    flipY: frame.flipY || false,
    clipPath: clip,
    objectCaching: false,
  } as any);
  img.setCoords();
  img.dirty = true;
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


// kind: "spread" | "single" — which view the layout frame belongs to. Legacy frames (undefined) match both.
function kindMatches(o: any, kind?: string) {
  if (!kind) return true;
  const k = o.customProperties?.layoutKind;
  return k == null || k === kind;
}


// ponytail: absolute clip (canvas coords) -> photo-local clip, so it survives
// the group layout rewrite (children become group-relative, clip would stay behind).
// Photo center == frame center, so the frame box recenters on photo-local origin.
export function relocalizeClipToPhoto(photo: any, frame: any) {
  const clip = photo?.clipPath;
  if (!clip) return;
  const fw = (frame.width || 0) * (frame.scaleX || 1);
  const fh = (frame.height || 0) * (frame.scaleY || 1);
  const sx = photo.scaleX || 1,
    sy = photo.scaleY || 1;
  const fc = frame.getCenterPoint();
  const pc = photo.getCenterPoint();
  const lw = fw / sx,
    lh = fh / sy;
  clip.set({
    absolutePositioned: false,
    angle: (frame.angle || 0) - (photo.angle || 0),
    scaleX: (clip.scaleX || 1) / sx,
    scaleY: (clip.scaleY || 1) / sy,
    left: (fc.x - pc.x) / sx - lw / 2,
    top: (fc.y - pc.y) / sy - lh / 2,
  });
  clip.setCoords();
  photo.dirty = true;
}


export function groupSelectedObjects(canvas: fabric.Canvas) {
  const sel = canvas.getActiveObject();
  if (!sel || (sel as any).type !== "activeselection") return;
  const objects = (sel as any).removeAll() as fabric.FabricObject[];
  const all = [...objects];
  objects.forEach((o: any) => {
    if (o.customProperties?.layer === "frame") {
      const photo = findPhotoInFrame(canvas, o);
      if (photo && !all.includes(photo)) {
        canvas.remove(photo);
        all.push(photo);
      }
    }
  });
  // ponytail: Group() does NOT detach children from canvas (removeAll only detaches
  // from the selection) — without this, rubber-band grabs group + leftovers.
  canvas.remove(...all);
  const group = new fabric.Group(all, { subTargetCheck: true, interactive: true } as any);
  const maxZ = all.reduce((m: number, o: any) => Math.max(m, o.customProperties?.z ?? 0), 0);
  (group as any).customProperties = { z: maxZ + 10, layer: "element" };
  canvas.add(group);
  // ponytail: group layout rewrites children to group-relative coords, but absolute
  // clipPaths stay in canvas coords -> photo clipped away (invisible). Convert to local.
  all.forEach((o: any) => {
    if (o.customProperties?.layer !== "photo") return;
    const frame = all.find(
      (f: any) => isFrameObject(f) && (f as any)._selId === o.customProperties?.frameId,
    );
    if (frame) relocalizeClipToPhoto(o, frame);
  });
  // ponytail: grouped children stay selectable (hit-test/drop/panel) but only the
  // whole group may move — lock every child transform, restore on ungroup.
  all.forEach((o: any) => {
    (o as any).__groupSavedLocks = {
      lockMovementX: o.lockMovementX,
      lockMovementY: o.lockMovementY,
      lockScalingX: o.lockScalingX,
      lockScalingY: o.lockScalingY,
      lockRotation: o.lockRotation,
      hasControls: o.hasControls,
    };
    o.set({
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hasControls: false,
    } as any);
  });
  canvas.setActiveObject(group);
  canvas.requestRenderAll();
  enforceZLayers(canvas);
}


export function ungroupSelectedObjects(canvas: fabric.Canvas) {
  const group = canvas.getActiveObject() as any;
  if (!group || group.type !== "group") return;
  canvas.discardActiveObject();
  canvas.remove(group);
  // ponytail: exitGroup restores canvas coords but clears canvas ref — re-add,
  // otherwise children are detached (invisible to save/select-all).
  const children = group.removeAll() as fabric.FabricObject[];
  children.forEach((c) => canvas.add(c));
  // ponytail: photo clips were photo-local inside the group — rebuild absolute.
  children.forEach((o: any) => {
    if (o.customProperties?.layer !== "photo") return;
    const frame = resolveFrameForPhoto(canvas, o as fabric.FabricImage);
    if (frame) applyFrameClip(frame, o as fabric.FabricImage);
  });
  // ponytail: restore the per-child transform locks saved at group time.
  children.forEach((c: any) => {
    const s = (c as any).__groupSavedLocks;
    if (!s) return;
    c.set({
      lockMovementX: s.lockMovementX,
      lockMovementY: s.lockMovementY,
      lockScalingX: s.lockScalingX,
      lockScalingY: s.lockScalingY,
      lockRotation: s.lockRotation,
      hasControls: s.hasControls,
    } as any);
    delete (c as any).__groupSavedLocks;
  });
  const sel = new (fabric.ActiveSelection as any)(children, { canvas: canvas as any });
  canvas.setActiveObject(sel);
  canvas.requestRenderAll();
  enforceZLayers(canvas);
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




// ponytail: rect-bounds fallback for a frame whose containsPoint misses on rotated/scaled shapes.
function frameContainsPoint(o: any, x: number, y: number): boolean {
  if ((o as fabric.FabricObject).containsPoint(new fabric.Point(x, y))) return true;
  const l = o.left || 0;
  const t = o.top || 0;
  const r = l + (o.width || 0) * (o.scaleX || 1);
  const b = t + (o.height || 0) * (o.scaleY || 1);
  return x >= l && x <= r && y >= t && y <= b;
}

// ponytail: searches inside groups too — frame at any nesting depth is hit-testable.
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
  // ponytail: absolute bbox first — covers nested children with no toLocalPoint needed
  if (typeof obj.getBoundingRect === "function") {
    try {
      const r = obj.getBoundingRect(true, true);
      if (x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height)
        return obj as fabric.FabricObject;
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


// ponytail: absolute canvas-space rect — frame.left/top are group-relative
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

// ponytail: top-level photos + photos nested one level inside groups.
function allPhotos(canvas: fabric.Canvas): any[] {
  const out: any[] = [];
  canvas.getObjects().forEach((o: any) => {
    if (o.customProperties?.layer === "photo") out.push(o);
    if ((o.type === "group" || o.type === "activeselection") && Array.isArray(o._objects)) {
      o._objects.forEach((c: any) => {
        if (c.customProperties?.layer === "photo") out.push(c);
      });
    }
  });
  return out;
}

export function addFrameDragOverlays(canvas: fabric.Canvas) {
  // ponytail: inline removal to batch into single renderAll instead of two
  canvas
    .getObjects()
    .filter((o: any) => o[OVERLAY_KEY] === true)
    .forEach((o) => canvas.remove(o));
  const photos = allPhotos(canvas);
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

// kind: "spread" | "single" — which view the layout frame belongs to. Legacy frames (undefined) match both.

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
  (img as any).__photoRelScaleX = 1;
  (img as any).__photoRelScaleY = 1;
  (img as any).__frameOffsetX = 0;
  (img as any).__frameOffsetY = 0;
  img.set({
    hasControls: false,
    hasBorders: false,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    selectable: false,
    evented: false,
    customProperties: {
      z: frameZ - 1,
      layer: "photo",
      frameId: (frame as any)._selId,
      layoutKind: (frame as any).customProperties?.layoutKind ?? null,
    },
  } as any);
  (img as any)._selId = `photo-frame-${Date.now()}`;
  return true;
}


export function applyFrameClip(frame: fabric.FabricObject, img: fabric.FabricImage) {
  const fw = (frame.width || 100) * (frame.scaleX || 1);
  const fh = (frame.height || 100) * (frame.scaleY || 1);
  const fl = frame.left || 0,
    ft = frame.top || 0;
  const shapeName = (frame as any).customProperties?.shapeName;
  if (shapeName) {
    const size = (frame as any).customProperties?.shapeSize || fw;
    const clip = createClipPath(shapeName, size, size);
    clip.set({
      left: fl,
      top: ft,
      scaleX: frame.scaleX || 1,
      scaleY: frame.scaleY || 1,
      angle: frame.angle || 0,
    } as any);
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
  // ponytail: grouped frame lives in group space — absolute clip would stay behind.
  if ((frame as any).group) relocalizeClipToPhoto(img, frame);
}


// ponytail: photos live inside groups after grouping — search one level deep too,
// otherwise delete/move of a grouped frame orphans its photo.
function allPhotoCandidates(canvas: fabric.Canvas): any[] {
  const out: any[] = [];
  canvas.getObjects().forEach((o: any) => {
    out.push(o);
    if ((o.type === "group" || o.type === "activeselection") && Array.isArray(o._objects)) {
      o._objects.forEach((c: any) => out.push(c));
    }
  });
  return out;
}

export function findPhotoInFrame(canvas: fabric.Canvas, frame: fabric.FabricObject): fabric.FabricImage | undefined {
  const frameId = (frame as any)._selId;
  const candidates = allPhotoCandidates(canvas);
  if (frameId) {
    const photo = candidates.find(
      (o: any) => o.customProperties?.frameId === frameId && !(o as any).hasControls,
    ) as fabric.FabricImage | undefined;
    if (photo) return photo;
  }
  // fallback: only match orphan photos (no frameId) whose center is inside this frame
  return candidates.find((o: any) => {
    if (o.customProperties?.layer !== "photo" || (o as any).hasControls) return false;
    if (o.customProperties?.frameId && o.customProperties.frameId !== frameId) return false;
    return frame.containsPoint(new fabric.Point(o.left || 0, o.top || 0));
  }) as fabric.FabricImage | undefined;
}


export function movePhotoWithFrame(frame: fabric.FabricObject, photo: fabric.FabricImage) {
  if ((photo as any).hasControls === true) return;
  const fc = frame.getCenterPoint();
  const fw = (frame.width || 100) * (frame.scaleX || 1);
  const fh = (frame.height || 100) * (frame.scaleY || 1);
  const imgW = photo.width || 1,
    imgH = photo.height || 1;
  // ponytail: always re-contain-fit to the current frame size; user scale/offset
  // edits from lockPhotoInFrame are kept as relative deltas so they survive resizes
  const containS = Math.min(fw / imgW, fh / imgH);
  const relSX = (photo as any).__photoRelScaleX ?? 1;
  const relSY = (photo as any).__photoRelScaleY ?? 1;
  const lockW = (frame.width || 100) * ((photo as any).__frameLockScaleX || 1);
  const lockH = (frame.height || 100) * ((photo as any).__frameLockScaleY || 1);
  const offX = ((photo as any).__frameOffsetX || 0) * (fw / lockW);
  const offY = ((photo as any).__frameOffsetY || 0) * (fh / lockH);
  const shapeName = (frame as any).customProperties?.shapeName;
  let clip;
  if (shapeName) {
    const size = (frame as any).customProperties?.shapeSize || fw;
    clip = createClipPath(shapeName, size, size);
    clip.set({
      left: frame.left,
      top: frame.top,
      scaleX: frame.scaleX || 1,
      scaleY: frame.scaleY || 1,
      angle: frame.angle || 0,
    } as any);
  } else {
    clip = createRectPath(fw, fh);
    clip.set({
      left: frame.left,
      top: frame.top,
      angle: frame.angle || 0,
      absolutePositioned: true,
      objectCaching: false,
    } as any);
  }
  clip.setCoords();
  photo.set({
    left: fc.x + offX,
    top: fc.y + offY,
    scaleX: containS * relSX,
    scaleY: containS * relSY,
    angle: frame.angle || 0,
    clipPath: clip,
  } as any);
  photo.setCoords();
  photo.dirty = true;
  // ponytail: grouped frame lives in group space — absolute clip would stay behind.
  if ((frame as any).group) relocalizeClipToPhoto(photo, frame);
}


export function resolveFrameForPhoto(
  canvas: fabric.Canvas,
  photo: fabric.FabricImage,
): fabric.FabricObject | undefined {
  const fid = (photo as any).customProperties?.frameId;
  // ponytail: grouped photo's frame may live in the same group — check there first.
  const parentGroup = (photo as any).group;
  if (fid && parentGroup && Array.isArray(parentGroup._objects)) {
    const frame = parentGroup._objects.find((o: any) => isFrameObject(o) && (o as any)._selId === fid);
    if (frame) return frame;
  }
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
    hasControls: true,
    hasBorders: true,
    lockMovementX: false,
    lockMovementY: false,
    lockScalingX: false,
    lockScalingY: false,
    lockRotation: false,
    selectable: true,
    evented: true,
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
  (photo as any).customProperties = {
    ...((photo as any).customProperties || {}),
    z: savedZ !== undefined ? savedZ : 0,
  };
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
    const fwl = (frame.width || 100) * (frame.scaleX || 1);
    const fhl = (frame.height || 100) * (frame.scaleY || 1);
    const containS = Math.min(fwl / (photo.width || 1), fhl / (photo.height || 1));
    (photo as any).__photoRelScaleX = (photo.scaleX || 1) / containS;
    (photo as any).__photoRelScaleY = (photo.scaleY || 1) / containS;
    applyFrameClip(frame, photo);
    frame.set({
      evented: (frame as any).__savedEvented !== undefined ? (frame as any).__savedEvented : true,
      selectable: (frame as any).__savedSelectable !== undefined ? (frame as any).__savedSelectable : true,
      hasControls: true,
      hasBorders: true,
    } as any);
  }
  photo.set({
    hasControls: false,
    hasBorders: false,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    selectable: false,
    evented: false,
  } as any);
  photo.setCoords();
  enforceZLayers(canvas);
}

// Exits photo edit mode even when the edited photo is gone (e.g. it was just deleted).
// Without this, canvas.selection stays false and every other object stays
// evented:false/selectable:false → nothing can be selected afterwards.

// Exits photo edit mode even when the edited photo is gone (e.g. it was just deleted).
// Without this, canvas.selection stays false and every other object stays
// evented:false/selectable:false → nothing can be selected afterwards.
export function resetCanvasInteractions(canvas: fabric.Canvas) {
  removePhotoDimOverlays(canvas);
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
  canvas.renderAll();
}


export function addPhotoDimOverlays(canvas: fabric.Canvas, photo: fabric.FabricObject) {
  removePhotoDimOverlays(canvas);
  const cw = canvas.width || 1000,
    ch = canvas.height || 1000;
  const frame = resolveFrameForPhoto(canvas, photo as fabric.FabricImage);
  const target = frame || photo;
  target.setCoords();
  const center = target.getCenterPoint();
  const hw = ((target.width || 100) * (target.scaleX || 1)) / 2;
  const hh = ((target.height || 100) * (target.scaleY || 1)) / 2;
  const rad = ((target.angle || 0) * Math.PI) / 180;
  const cos = Math.cos(rad),
    sin = Math.sin(rad);
  const rel = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  const corners = rel.map((c) => ({
    x: center.x + c.x * cos - c.y * sin,
    y: center.y + c.x * sin + c.y * cos,
  }));

  const pathData = `M 0 0 L ${cw} 0 L ${cw} ${ch} L 0 ${ch} Z M ${corners.map((c) => `${c.x} ${c.y}`).join(" L ")} Z`;
  const overlay = new fabric.Path(pathData, {
    fill: "rgba(128,128,128,0.55)",
    fillRule: "evenodd",
    selectable: false,
    evented: false,
    excludeFromExport: true,
  } as any);
  (overlay as any)[DIM_OVERLAY_KEY] = true;
  (overlay as any).customProperties = { z: 999, layer: "dimOverlay" };
  canvas.add(overlay);
  canvas.renderAll();
}


export function removePhotoDimOverlays(canvas: fabric.Canvas) {
  canvas
    .getObjects()
    .filter((o: any) => o[DIM_OVERLAY_KEY] === true)
    .forEach((o) => canvas.remove(o));
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
// ponytail: removed the layoutKind visibility gating — it made elements "disappear" on view switch.


// Fabric v7 loadFromJSON drops custom properties; re-apply them from the JSON data
// ponytail: use Fabric v7's built-in reviver instead of post-processing

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



// Re-apply each photo's frame clip after a reload. Undo/redo snapshots can be
// taken while a photo is in edit mode (clipPath null), and reviveObject locks
// the photo back without restoring the clip — leaving the frame unable to mask
// the photo overflow.

// Re-apply each photo's frame clip after a reload. Undo/redo snapshots can be
// taken while a photo is in edit mode (clipPath null), and reviveObject locks
// the photo back without restoring the clip — leaving the frame unable to mask
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
function detachObject(canvas: fabric.Canvas, o: any) {
  if (o?.group && typeof o.group.remove === "function") o.group.remove(o);
  else canvas.remove(o);
}

export function deleteSelectedObjects(canvas: fabric.Canvas) {
	const sel = canvas.getActiveObjects();
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
