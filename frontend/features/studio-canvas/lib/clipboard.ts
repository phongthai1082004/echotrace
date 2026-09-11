import * as fabric from "fabric";
import { isFrameObject, enforceZLayers } from "./fabric-core";
import { findPhotoInFrame, applyFrameClip } from "./frames";

// ponytail: enlivened photos lose their lock flags (not in toJSON keys) and keep a
// stale absolute clip — without this the pasted photo is invisible AND blocks its frame.
function restorePastedPhoto(photo: any, frame: any) {
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
  applyFrameClip(frame, photo);
}

export function serializeSel(canvas: fabric.Canvas, obj: fabric.FabricObject): string {
	const SEL_KEYS = ["z", "layer", "customProperties", "_selId"];
	const PHOTO_KEYS = [
		"z", "layer", "customProperties", "_selId", "clipPath",
		"__frameLockScaleX", "__frameLockScaleY",
		"__photoLockScaleX", "__photoLockScaleY",
		"__photoRelScaleX", "__photoRelScaleY",
		"__frameOffsetX", "__frameOffsetY",
	];

	// W1: frame+photo composite (single)
	if (isFrameObject(obj)) {
		const photo = findPhotoInFrame(canvas, obj);
		if (photo) {
			return JSON.stringify({
				_composite: true,
				frame: (obj as any).toObject(SEL_KEYS),
				photo: (photo as any).toObject(PHOTO_KEYS),
				frameSelId: (obj as any)._selId,
				photoFrameId: (photo as any).customProperties?.frameId,
			});
		}
	}

	// W1: multi-selection / group -> serialize each child separately (ActiveSelection
	// and Group JSON cannot survive enlivenObjects with custom properties).
	if ((obj as any).type === "activeselection" || (obj as any).type === "group") {
		const objects = (obj as any).getObjects().map((o: any) => {
			if (isFrameObject(o)) {
				const photo: any = findPhotoInFrame(canvas, o);
				if (photo) {
					return {
						_composite: true,
						frame: o.toObject(SEL_KEYS),
						photo: (photo as any).toObject(PHOTO_KEYS),
						frameSelId: (o as any)._selId,
						photoFrameId: photo.customProperties?.frameId,
					};
				}
			}
			return o.toObject(SEL_KEYS);
		});
		return JSON.stringify({ _multi: true, objects });
	}

	return JSON.stringify((obj as any).toObject(SEL_KEYS));
}


export function pasteClipboard(
  canvas: fabric.Canvas,
  clipboard: string,
  pasteCount: number,
  bumpPasteCount: () => void,
  pushUndo: () => void,
) {
  pushUndo();
  const parsed = JSON.parse(clipboard);
  // W1: multi-object paste (from ActiveSelection/group copies)
	if (parsed._multi) {
		const off = 20 + pasteCount * 20;
	const enlivened = parsed.objects.map((entry: any) => {
		if (entry._composite) {
			return Promise.all([
				fabric.util.enlivenObjects([entry.frame]),
				fabric.util.enlivenObjects([entry.photo]),
			]).then(([f, p]: any[][]) => ({ frame: f[0], photo: p[0], entry }));
		}
		return fabric.util.enlivenObjects([entry]).then((arr: any[]) => ({ obj: arr[0], entry }));
	});
		Promise.all(enlivened).then((items) => {
			const added: fabric.FabricObject[] = [];
			const baseZ = Date.now();
			items.forEach((it: any, i: number) => {
				if (it.frame && it.photo) {
					const selId = `frame-${Date.now()}-${i}`;
					// ponytail: read customProperties from JSON — enlivenObjects drops them.
					it.frame.set({
						left: (it.frame.left || 0) + off,
						top: (it.frame.top || 0) + off,
						customProperties: { layer: "frame", ...it.entry?.frame?.customProperties, z: baseZ - i * 2 },
					} as any);
					(it.frame as any)._selId = selId;
					it.photo.set({
						left: (it.photo.left || 0) + off,
						top: (it.photo.top || 0) + off,
						customProperties: { layer: "photo", ...it.entry?.photo?.customProperties, z: baseZ - i * 2 - 1, frameId: selId },
					} as any);
					(it.photo as any)._selId = `photo-${Date.now()}-${i}`;
					restorePastedPhoto(it.photo, it.frame);
					canvas.add(it.frame);
					canvas.add(it.photo);
					added.push(it.frame);
				} else if (it.obj) {
					it.obj.set({
						left: (it.obj.left || 0) + off,
						top: (it.obj.top || 0) + off,
						// ponytail: enlivened objects lose customProperties — restore from JSON
						// or an empty pasted frame stops being a frame (can't drop photos in).
						customProperties: { layer: "element", ...it.entry?.customProperties, z: baseZ - i * 2 },
					} as any);
					(it.obj as any)._selId = `paste-${Date.now()}-${i}`;
					canvas.add(it.obj);
					added.push(it.obj);
				}
			});
			canvas.discardActiveObject();
			if (added.length > 1) {
				const sel = new fabric.ActiveSelection(added, { canvas });
				canvas.setActiveObject(sel);
			} else if (added[0]) {
				canvas.setActiveObject(added[0]);
			}
			canvas.renderAll();
			enforceZLayers(canvas);
			bumpPasteCount();
		});
		return;
	}

	if (parsed._composite) {
    fabric.util.enlivenObjects([parsed.frame]).then((arrF: any[]) => {
      fabric.util.enlivenObjects([parsed.photo]).then((arrP: any[]) => {
        const frame = arrF[0];
        const photo = arrP[0];
        if (!frame || !photo) return;
        const off = 20 + pasteCount * 20;
        const selId = `frame-${Date.now()}`;
        frame.set({
          left: (frame.left || 0) + off,
          top: (frame.top || 0) + off,
          customProperties: { layer: "frame", ...parsed.frame.customProperties, z: Date.now() },
        } as any);
        (frame as any)._selId = selId;
        photo.set({
          left: (photo.left || 0) + off,
          top: (photo.top || 0) + off,
          customProperties: { layer: "photo", ...parsed.photo.customProperties, z: Date.now() - 1, frameId: selId },
        } as any);
        (photo as any)._selId = `photo-${Date.now()}`;
        restorePastedPhoto(photo, frame);
        canvas.add(frame);
        canvas.add(photo);
        canvas.setActiveObject(frame);
        canvas.renderAll();
        enforceZLayers(canvas);
        bumpPasteCount();
      });
    });
  } else {
    const savedCp = parsed.customProperties,
      savedSelId = parsed._selId;
    fabric.util.enlivenObjects([parsed]).then((arr: any[]) => {
      const obj = arr[0];
      if (!obj) return;
      const off = 20 + pasteCount * 20;
      obj.set({
        left: (obj.left || 0) + off,
        top: (obj.top || 0) + off,
        customProperties: savedCp || { z: Date.now(), layer: "element" },
      } as any);
      if (savedSelId) (obj as any)._selId = savedSelId;
      (obj as any)._selId = `paste-${Date.now()}`;
      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.renderAll();
      enforceZLayers(canvas);
      bumpPasteCount();
    });
  }
}

