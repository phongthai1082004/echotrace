import * as fabric from "fabric";
import { isFrameObject, enforceZLayers } from "./fabric-core";
import { findPhotoInFrame, relocalizeClipToPhoto, resolveFrameForPhoto, applyFrameClip } from "./photos";

// ponytail: group lifecycle only -- collect frames (+their photos), wrap, unwrap.


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
  // from the selection) -- without this, rubber-band grabs group + leftovers.
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
  // whole group may move -- lock every child transform, restore on ungroup.
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
  // ponytail: exitGroup restores canvas coords but clears canvas ref -- re-add,
  // otherwise children are detached (invisible to save/select-all).
  const children = group.removeAll() as fabric.FabricObject[];
  children.forEach((c) => canvas.add(c));
  // ponytail: photo clips were photo-local inside the group -- rebuild absolute.
  children.forEach((o: any) => {
    if (o.customProperties?.layer !== "photo") return;
    const frame = resolveFrameForPhoto(canvas, o as fabric.FabricImage);
    if (frame) applyFrameClip(frame, o as fabric.FabricImage);
  });
  // ponytail: restore the per-child transform locks saved at group time.
  // No saved state (e.g. group loaded from a save) -> photos stay locked, rest unlock.
  children.forEach((c: any) => {
    const s = (c as any).__groupSavedLocks;
    if (s) {
      c.set({
        lockMovementX: s.lockMovementX,
        lockMovementY: s.lockMovementY,
        lockScalingX: s.lockScalingX,
        lockScalingY: s.lockScalingY,
        lockRotation: s.lockRotation,
        hasControls: s.hasControls,
      } as any);
      delete (c as any).__groupSavedLocks;
    } else if ((c as any).customProperties?.layer !== "photo") {
      c.set({
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: false,
        hasControls: true,
      } as any);
    }
  });
  const sel = new (fabric.ActiveSelection as any)(children, { canvas: canvas as any });
  canvas.setActiveObject(sel);
  canvas.requestRenderAll();
  enforceZLayers(canvas);
}
