import * as fabric from "fabric";

export function isFrameObject(obj: fabric.FabricObject): boolean {
  return (obj as any).customProperties?.layer === "frame";
}

// (with border, no handles) so it can be unlocked from the tooltip.
export function isObjectLocked(o: any): boolean {
  return !!(
    o?.lockMovementX &&
    o?.lockMovementY &&
    o?.lockScalingX &&
    o?.lockScalingY &&
    o?.lockRotation
  );
}

export function setObjectLocked(o: any, locked: boolean) {
  o.set({
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
    hasControls: !locked,
    hasBorders: true,
  } as any);
  o.setCoords?.();
}


export function styleFrame(o: any) {
  const cp = o.customProperties || {};
  o.set({
    stroke: cp.borderHidden ? "transparent" : "#000",
    strokeWidth: cp.strokeWidth || 1,
    strokeUniform: true,
    strokeDashArray: undefined,
  } as any);
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


export function syncFrameBorders(canvas: fabric.Canvas) {
  canvas.getObjects().forEach((o: any) => {
    if (o.customProperties?.layer !== "frame") return;

    styleFrame(o);
  });
  canvas.requestRenderAll();
}


export function canvasPointer(canvas: fabric.Canvas, clientX: number, clientY: number): { x: number; y: number } {
  const el = canvas.getElement();
  const rect = el.getBoundingClientRect();
  const p = new fabric.Point(
    (clientX - rect.left) * (canvas.getWidth() / rect.width),
    (clientY - rect.top) * (canvas.getHeight() / rect.height),
  );
  // ngày nào bật zoom/pan fabric thì drop/hover khỏi lệch hệ thống.
  const vpt = (canvas as any).viewportTransform;
  if (!vpt) return { x: p.x, y: p.y };
  const scene = (fabric as any).util.transformPoint(p, (fabric as any).util.invertTransform(vpt));
  return { x: scene.x, y: scene.y };
}

