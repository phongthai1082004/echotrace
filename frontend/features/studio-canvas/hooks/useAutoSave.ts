"use client";

import { useCanvasStore } from "./useCanvasState";
import { calculateSpineWidth } from "../lib/spine";
import { serializeCanvasState, isCoverPage, splitCanvasByMidpoint } from "../lib/layout-engine";
import { useStudioAPI } from "../context/studio-context";
import { resolveFormat } from "../types";
import { uploadToR2 } from "@/lib/upload";

// ponytail: nhớ canvasJson lần cuối đã có thumb trên R2 theo trang — chặn re-upload object rác mỗi autosave tick.
// Reset khi reload là chấp nhận được (tối đa 1 lần upload dư mỗi trang/phiên).
const lastThumbUpload = new Map<string, string>();

export function useAutoSave() {
  const api = useStudioAPI();

  const saveFull = async (token?: string): Promise<{ ok: boolean; error?: string; id?: number }> => {
    const s = useCanvasStore.getState();
    const c = s.canvas;
    if (!c) return { ok: false, error: "No canvas" };

    const pageCount = s.pages.length;
    const spineWidth = calculateSpineWidth({ gsm: s.bookMeta.gsm || 200, pageCount });

    const currentJson = serializeCanvasState(c);
    const updatedPages = [...s.pages];
    const spread = !isCoverPage(s.activePageIndex, pageCount) && s.viewMode === "spread";
    if (!isCoverPage(s.activePageIndex, pageCount) && c.getWidth() > 400) {
      const { leftJson, rightJson } = splitCanvasByMidpoint(currentJson, c.getWidth() / 2);
      const layoutField = spread
        ? { spreadLayout: s.activeLayout, layout: null }
        : { layout: s.activeLayout, spreadLayout: null };
      updatedPages[s.activePageIndex] = { ...updatedPages[s.activePageIndex], canvasJson: leftJson, ...layoutField };
      updatedPages[Math.min(s.activePageIndex + 1, pageCount - 1)] = {
        ...updatedPages[Math.min(s.activePageIndex + 1, pageCount - 1)],
        canvasJson: rightJson,
        ...layoutField,
      };
    } else {
      // ponytail: upload fail thì giữ thumbnail cũ, không block saveFull (fallback an toàn)
      let thumbnailUrl = updatedPages[s.activePageIndex].thumbnailUrl;
      const thumbKey = `${s.bookMeta.id ?? "new"}:${s.activePageIndex}`;
      if (token && lastThumbUpload.get(thumbKey) !== currentJson) {
        try {
          const dataUrl = c.toDataURL({ format: "jpeg", quality: 0.4, multiplier: 0.5 });
          const file = new File([await (await fetch(dataUrl)).blob()], "thumb.jpg", { type: "image/jpeg" });
          thumbnailUrl = (await uploadToR2(file, "book-thumb", token)).url;
          lastThumbUpload.set(thumbKey, currentJson);
        } catch (err) {
          console.warn("[useAutoSave] thumb upload failed, keeping previous:", err);
        }
      }
      updatedPages[s.activePageIndex] = {
        ...updatedPages[s.activePageIndex],
        canvasJson: currentJson,
        thumbnailUrl,
        layout: s.activeLayout,
      };
    }
    useCanvasStore.getState().setPages(updatedPages);

    const pagesAll = updatedPages.map((p) => ({
      index: p.index,
      layout: p.layout,
      spreadLayout: p.spreadLayout,
      canvasJson: p.canvasJson,
      thumbnailUrl: p.thumbnailUrl,
    }));

    const metaSig = JSON.stringify([
      s.bookMeta.title,
      s.bookMeta.kind,
      s.bookMeta.format,
      s.bookMeta.paper || "matte",
      s.bookMeta.gsm || 200,
      spineWidth,
    ]);

    const payload: Record<string, unknown> = {
      version: 3,
      id: s.bookMeta.id || undefined,
      title: s.bookMeta.title,
      kind: s.bookMeta.kind,
      pageCount,
      paperSize: s.bookMeta.format,
      paper: s.bookMeta.paper || "matte",
      gsm: s.bookMeta.gsm || 200,
      spineWidth,
    };

    // ponytail: snapshot phiên làm việc — gửi chỉ trang dirty, reset khi reload là đủ an toàn.
    const bookKey = String(s.bookMeta.id ?? "new");
    const prev = lastSavedBooks.get(bookKey);
    if (!prev) {
      payload.pages = pagesAll; // lần đầu / book mới → full sync
    } else if (prev.pages.length !== pagesAll.length) {
      payload.pages = pagesAll; // thêm/bớt trang → full sync
    } else {
      const dirty = pagesAll.filter((p, i) => !samePage(prev.pages[i], p));
      if (dirty.length === 0 && prev.metaSig === metaSig) {
        return { ok: true, id: s.bookMeta.id ?? undefined }; // chẳng gì đổi → bỏ qua network
      }
      if (dirty.length > 0) payload.changedPages = dirty;
    }

    // Size lives on the Book/SampleBook columns (paperHeight/paperWidth, mm), not inside content.
    const fmt = resolveFormat({ format: s.bookMeta.format, width: s.bookMeta.width, height: s.bookMeta.height });
    payload.paperHeight = Math.round(fmt.height / 4);
    payload.paperWidth = Math.round(fmt.width / 4);

    const result = await api.save(token ?? "", s.bookMeta.id, payload);
    if (result.ok && result.id) {
      useCanvasStore.getState().setBookMeta({ id: result.id });
      lastSavedBooks.set(String(result.id), { pages: pagesAll, metaSig });
    }
    return result;
  };

  return { saveFull };
}

type PageSnapshot = {
  index: number;
  layout: unknown;
  spreadLayout: unknown;
  canvasJson: string | null;
  thumbnailUrl: string | null;
};

const lastSavedBooks = new Map<string, { pages: PageSnapshot[]; metaSig: string }>();

function samePage(a: PageSnapshot | undefined, b: PageSnapshot): boolean {
  return (
    !!a &&
    a.canvasJson === b.canvasJson &&
    a.thumbnailUrl === b.thumbnailUrl &&
    a.layout === b.layout &&
    a.spreadLayout === b.spreadLayout
  );
}
