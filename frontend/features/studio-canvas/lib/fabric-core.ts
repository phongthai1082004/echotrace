import * as fabric from "fabric";

export function isFrameObject(obj: fabric.FabricObject): boolean {
  return (obj as any).customProperties?.layer === "frame";
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
  return {
    x: (clientX - rect.left) * (canvas.getWidth() / rect.width),
    y: (clientY - rect.top) * (canvas.getHeight() / rect.height),
  };
}

