"use client";

import * as fabric from "fabric";
import { useCanvasStore } from "./useCanvasState";
import { serializeCanvasState } from "../lib/layout-engine";
import { parsePageJson } from "../lib/sparse-json";
import { placePhotoInFrame, applyFrameClip } from "../lib/photos";
import { reviveDeep } from "../lib/frames";
import { enforceZLayers } from "../lib/fabric-core";
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";

export function useAutoFill(token: string | undefined) {
  const { showToast } = useToast();
  const autoFill = async () => {
    const c = useCanvasStore.getState().canvas;
    if (!c || !token) {
      showToast("No canvas or auth", "error");
      return;
    }
    useCanvasStore
      .getState()
      .setPage(useCanvasStore.getState().activePageIndex, { canvasJson: serializeCanvasState(c) });
    const s = useCanvasStore.getState();
    s.pushUndoPages();

    let galleryPhotos: { id: number; url: string }[];
    try {
      galleryPhotos = (await apiFetch<any[]>("/api/uploads/images", token, { cache: "no-cache" })) || [];
    } catch {
      showToast("Failed to fetch gallery", "error");
      return;
    }

    const usedUrls = new Set<string>();
    const pageEmptyFrames: { pageIdx: number; frameIdx: number; frameSelId: string }[] = [];

    for (let i = 0; i < s.pages.length; i++) {
      if (s.pages[i].locked) continue; // trang khóa => viewonly, không fill
      const pgJson = s.pages[i].canvasJson;
      if (!pgJson) continue;
      let objects: any[];
      try {
        objects = JSON.parse(pgJson).objects || [];
      } catch {
        continue;
      }

      objects.forEach((obj: any) => {
        if (obj.customProperties?.layer === "photo" && obj.src) usedUrls.add(obj.src);
      });

      objects.forEach((obj: any, idx: number) => {
        if (obj.customProperties?.layer === "frame") {
          const hasPhoto = objects.some(
            (o: any) => o.customProperties?.layer === "photo" && o.customProperties?.frameId === obj._selId,
          );
          if (!hasPhoto) pageEmptyFrames.push({ pageIdx: i, frameIdx: idx, frameSelId: obj._selId });
        }
      });
    }

    const unused = galleryPhotos.filter((p) => !usedUrls.has(p.url));
    if (unused.length === 0) {
      showToast("No unused photos available", "info");
      return;
    }
    if (pageEmptyFrames.length === 0) {
      showToast("No empty frames found", "info");
      return;
    }

    const offEl = document.createElement("canvas");
    offEl.width = 2000;
    offEl.height = 2000;
    const tc = new fabric.Canvas(offEl);
    const updatedPages = [...s.pages];
    let photoIdx = 0;

    for (const task of pageEmptyFrames) {
      if (photoIdx >= unused.length) break;
      const pgStr = updatedPages[task.pageIdx].canvasJson;
      if (!pgStr) continue;
      // thiếu defaults, fabric tự đắp kiểu khác là lệch tọa độ.
      const parsed = parsePageJson(pgStr);
      if (!parsed) continue;

      await tc.loadFromJSON(parsed).then(() => {
        tc.renderAll();
      });
      // vào group con, _selId/customProperties của khung grouped bị mất.
      try {
        reviveDeep(parsed.objects || [], tc.getObjects());
      } catch {
        /* keep top-level revive only */
      }

      const frame = tc.getObjects().find((o: any) => o._selId === task.frameSelId);
      if (!frame) {
        tc.clear();
        continue;
      }

      try {
        const img = await fabric.FabricImage.fromURL(unused[photoIdx].url, { crossOrigin: "anonymous" });
        placePhotoInFrame(frame, img);
        applyFrameClip(frame, img);
        // phải vào TRONG group (tọa độ group-relative). tc.add ra root là lệch
        // đúng bằng transform của group. Clip đã relocalize 1 lần trong
        // applyFrameClip nên không gọi lại (gọi 2 lần là chia đôi scale).
        const parentGroup = (frame as any).group;
        if (parentGroup && typeof parentGroup.add === "function") {
          parentGroup.add(img);
          parentGroup.setCoords();
        } else {
          tc.add(img);
        }
        tc.renderAll();
        enforceZLayers(tc);
        const newJson = serializeCanvasState(tc);
        updatedPages[task.pageIdx] = { ...updatedPages[task.pageIdx], canvasJson: newJson };
        photoIdx++;
      } catch {
        /* skip this photo on error */
      }
      tc.clear();
    }

    s.setPages(updatedPages);
    s.incrementUndoVersion();
    showToast(`Auto-filled ${photoIdx} photo(s)`, "success");
  };

  return { autoFill };
}
