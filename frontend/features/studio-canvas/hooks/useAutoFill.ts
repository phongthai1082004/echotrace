"use client";

import * as fabric from "fabric";
import { useCanvasStore } from "./useCanvasState";
import { serializeCanvasState } from "../lib/layout-engine";
import { placePhotoInFrame, applyFrameClip } from "../lib/photos";
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
      let parsed: any;
      try {
        parsed = JSON.parse(pgStr);
      } catch {
        continue;
      }

      await tc.loadFromJSON(parsed).then(() => {
        tc.renderAll();
      });
      const pgObjs = parsed.objects || [];
      tc.getObjects().forEach((live: any, i: number) => {
        if (pgObjs[i]) {
          if (pgObjs[i].customProperties) live.customProperties = pgObjs[i].customProperties;
          if (pgObjs[i]._selId) live._selId = pgObjs[i]._selId;
        }
      });

      const frame = tc.getObjects().find((o: any) => o._selId === task.frameSelId);
      if (!frame) {
        tc.clear();
        continue;
      }

      try {
        const img = await fabric.FabricImage.fromURL(unused[photoIdx].url, { crossOrigin: "anonymous" });
        placePhotoInFrame(frame, img);
        applyFrameClip(frame, img);
        tc.add(img);
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
