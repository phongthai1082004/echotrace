import * as fabric from "fabric";
import { createClipPath } from "./shapes";
import { isFrameObject, enforceZLayers } from "./fabric-core";
import { isCoverPage } from "./layout-engine";
import { useCanvasStore } from "../hooks/useCanvasState";

// edit-mode lock/unlock. Shares the frameId/_selId + clipPath conventions.

const DIM_OVERLAY_KEY = "_dimOverlay";


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


export function isCoarsePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

// looks instead of the dead middle of the 2P spread when editing L/R.
export function focusCenterX(canvas: fabric.Canvas): number {
  const w = canvas.getWidth() || 840;
  const s = useCanvasStore.getState();
  if (isCoverPage(s.activePageIndex, s.pages.length)) return w / 2;
  if (s.viewMode === "left") return w / 4;
  if (s.viewMode === "right") return (3 * w) / 4;
  return w / 2;
}

export async function placeFreeImage(
  canvas: fabric.Canvas,
  url: string,
  opts?: { maxSize?: number; extraProps?: Record<string, any>; prefix?: string },
): Promise<boolean> {
  const maxSize = opts?.maxSize ?? 300;
  let img: fabric.FabricImage;
  try {
    img = await fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
  } catch {
    return false;
  }
  const s = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1));
  img.set({
    left: focusCenterX(canvas),
    top: (canvas.getHeight() || 0) / 2,
    originX: "center",
    originY: "center",
    scaleX: s,
    scaleY: s,
    customProperties: { z: Date.now(), layer: "element", ...(opts?.extraProps ?? {}) },
  } as any);
  (img as any)._selId = `${opts?.prefix ?? "photo"}-${Date.now()}`;
  canvas.add(img);
  canvas.setActiveObject(img);
  canvas.renderAll();
  enforceZLayers(canvas);
  return true;
}

// fill/thay thế, rớt ra ngoài thì ảnh rời. findFrame inject từ ngoài để tránh
// cycle import frames<->photos (hitTestFrame sống ở frames.ts).
export async function placeDroppedPhoto(
  canvas: fabric.Canvas,
  x: number,
  y: number,
  url: string,
  findFrame: (canvas: fabric.Canvas, x: number, y: number) => fabric.FabricObject | undefined,
  onWrongHalf?: () => void,
): Promise<"filled" | "free" | "rejected" | "failed"> {
  const st = useCanvasStore.getState();
  const snapPage = st.activePageIndex;
  const snapView = st.viewMode;
  st.pushUndo();
  let img: fabric.FabricImage;
  try {
    img = await fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
  } catch {
    return "failed";
  }
  const st0 = useCanvasStore.getState();
  const samePage = st0.activePageIndex === snapPage && st0.viewMode === snapView;
  const frame = samePage ? findFrame(canvas, x, y) : undefined;

  if (frame) {
    const effView = isCoverPage(st0.activePageIndex, st0.pages.length) ? "spread" : st0.viewMode;
    if (effView !== "spread") {
      const halfW = (canvas.getWidth() || 840) / 2;
      const fc = frame.getCenterPoint();
      if ((effView === "left" && fc.x >= halfW) || (effView === "right" && fc.x < halfW)) {
        onWrongHalf?.();
        return "rejected";
      }
    }
    if (replacePhotoInFrame(canvas, frame, img)) {
      // add ảnh VÀO group, không phải canvas root, rồi relocalize clip.
      const parentGroup = (frame as any).group;
      if (parentGroup && typeof parentGroup.add === "function") {
        parentGroup.add(img);
        relocalizeClipToPhoto(img, frame);
        parentGroup.setCoords();
      } else {
        canvas.add(img);
      }
      canvas.setActiveObject(frame);
      canvas.renderAll();
      enforceZLayers(canvas);
      return "filled";
    }
  }

  const maxSize = 300;
  const s = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1));

  img.set({
    left: x,
    top: y,
    originX: "center",
    originY: "center",
    scaleX: s,
    scaleY: s,
    customProperties: { z: Date.now(), layer: "element" },
  } as any);
  (img as any)._selId = `photo-${Date.now()}`;
  canvas.add(img);
  canvas.setActiveObject(img);
  canvas.renderAll();
  enforceZLayers(canvas);
  return "free";
}

export function placePhotoInFrame(frame: fabric.FabricObject, img: fabric.FabricImage) {
  const canvas = (frame as any).canvas;
  if (canvas && findPhotoInFrame(canvas, frame)) return false;  const frameZ = (frame as any).customProperties?.z ?? 50;
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

// Trước đây placePhotoInFrame trả false → drop handler đẻ ảnh rời đè lên, tưởng "không khớp".
export function replacePhotoInFrame(
  canvas: fabric.Canvas,
  frame: fabric.FabricObject,
  img: fabric.FabricImage,
): boolean {
  const old = canvas ? findPhotoInFrame(canvas, frame) : undefined;
  if (old) {
    const g = (old as any).group;
    if (g && g.type === "group" && typeof g.remove === "function") g.remove(old);
    else canvas.remove(old);
    try {
      (old as any).dispose?.();
    } catch {}
  }
  // gỡ xong thì khung lại trống → place thường (giữ nguyên guard cho autofill)
  return placePhotoInFrame(frame, img);
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
  if ((frame as any).group) relocalizeClipToPhoto(img, frame);
}


// otherwise delete/move of a grouped frame orphans its photo.
export function allPhotoCandidates(canvas: fabric.Canvas): any[] {
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
  // user scale/offset edits from lockPhotoInFrame are kept as relative deltas so they survive resizes
  const coverS = Math.max(fw / imgW, fh / imgH);
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
    scaleX: coverS * relSX,
    scaleY: coverS * relSY,
    angle: frame.angle || 0,
    clipPath: clip,
  } as any);
  photo.setCoords();
  photo.dirty = true;
  if ((frame as any).group) relocalizeClipToPhoto(photo, frame);
}


export function resolveFrameForPhoto(
  canvas: fabric.Canvas,
  photo: fabric.FabricImage,
): fabric.FabricObject | undefined {
  const fid = (photo as any).customProperties?.frameId;
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
  if (!frame) {
    // trước đây return im, photo kẹt liệt vĩnh viễn không đường thoát.
    photo.set({
      hasControls: true,
      hasBorders: true,
      lockMovementX: false,
      lockMovementY: false,
      lockScalingX: false,
      lockScalingY: false,
      lockRotation: false,
      selectable: true,
      evented: true,
    } as any);
    photo.setCoords();
    canvas.renderAll();
    return;
  }
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
    const coverS = Math.max(fwl / (photo.width || 1), fhl / (photo.height || 1));
    (photo as any).__photoRelScaleX = (photo.scaleX || 1) / coverS;
    (photo as any).__photoRelScaleY = (photo.scaleY || 1) / coverS;
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
