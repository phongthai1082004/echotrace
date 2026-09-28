"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore } from "./useCanvasState";
import { calculateSpineWidth } from "../lib/spine";
import { serializeCanvasState, isCoverPage, splitCanvasForView, samePageBackground } from "../lib/layout-engine";
import { useStudioAPI } from "../context/studio-context";
import type { StudioAPI } from "../api/studio-api";
import { resolveFormat } from "../types";
import { uploadToR2 } from "@/lib/upload";
import { serializePage } from "../lib/book-content";
import { diffPageObjects, parsePageJson } from "../lib/sparse-json";
import { readFirstTouch } from "@/lib/attribution";



const lastThumbUpload = new Map<string, string>();

// POST two books (duplicate creates) or interleave PATCHes.
let saveInflight: Promise<{ ok: boolean; error?: string; id?: number }> | null = null;

export function useAutoSave() {
  const api = useStudioAPI();

  const saveFull = (
    token?: string,
    opts?: { flush?: boolean },
  ): Promise<{ ok: boolean; error?: string; id?: number }> => guardedSave(api, token, opts);

  return { saveFull, sendBeacon: () => sendBeaconSave(api) };
}

async function runSaveFull(
  api: StudioAPI,
  token?: string,
  opts?: { flush?: boolean },
): Promise<{ ok: boolean; error?: string; id?: number }> {
  const s = useCanvasStore.getState();
    const c = s.canvas;
    if (!c) return { ok: false, error: "No canvas" };

    const pageCount = s.pages.length;
    const spineWidth = calculateSpineWidth({ gsm: s.bookMeta.gsm || 200, pageCount });

    const currentJson = serializeCanvasState(c);
    const updatedPages = [...s.pages];
    const spread = !isCoverPage(s.activePageIndex, pageCount) && s.viewMode === "spread";
    if (!isCoverPage(s.activePageIndex, pageCount) && c.getWidth() > 400) {
      const rightIdx = Math.min(s.activePageIndex + 1, pageCount - 1);
      // L/R chỉ đổi màu nửa focus, nửa kia giữ màu đã lưu; 2P đổi cả hai.
      const { leftJson, rightJson } = splitCanvasForView(
        currentJson,
        c.getWidth() / 2,
        s.viewMode,
        s.pages[s.activePageIndex]?.canvasJson,
        s.pages[rightIdx]?.canvasJson,
      );
      const layoutField = spread
        ? { spreadLayout: s.activeLayout, layout: null }
        : { layout: s.activeLayout, spreadLayout: null };
      updatedPages[s.activePageIndex] = { ...updatedPages[s.activePageIndex], canvasJson: leftJson, ...layoutField };
      updatedPages[rightIdx] = {
        ...updatedPages[rightIdx],
        canvasJson: rightJson,
        ...layoutField,
      };
      const [leftThumb, rightThumb] = await Promise.all([
        remoteThumb(updatedPages[s.activePageIndex].thumbnailUrl, token),
        rightIdx === s.activePageIndex
          ? updatedPages[s.activePageIndex].thumbnailUrl
          : remoteThumb(updatedPages[rightIdx].thumbnailUrl, token),
      ]);
      updatedPages[s.activePageIndex] = { ...updatedPages[s.activePageIndex], thumbnailUrl: leftThumb };
      updatedPages[rightIdx] = { ...updatedPages[rightIdx], thumbnailUrl: rightThumb };
    } else {

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
      locked: p.locked ?? false,
      // Backend merge content.pages theo index nên elements được lưu cùng trang.
      elements: serializePage(p.canvasJson, p.index)?.elements ?? [],
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
      schema: 2,
      id: s.bookMeta.id || undefined,
      title: s.bookMeta.title,
      kind: s.bookMeta.kind,
      pageCount,
      paperSize: s.bookMeta.format,
      paper: s.bookMeta.paper || "matte",
      gsm: s.bookMeta.gsm || 200,
      spineWidth,
    };
    // save tay: ép backend flush delta treo ngay trong request.
    if (opts?.flush) payload.flush = true;

    const bookKey = String(s.bookMeta.id ?? "new");
    const prev = lastSavedBooks.get(bookKey);
    if (!prev) {
      payload.pages = pagesAll; // lần đầu / book mới → full sync
      // attribution theo project, không theo session lúc thanh toán
      const touch = readFirstTouch();
      if (touch?.source) {
        payload.attribution = { source: touch.source, medium: touch.medium, campaign: touch.campaign };
      }
    } else if (prev.pages.length !== pagesAll.length) {
      payload.pages = pagesAll; // thêm/bớt trang → full sync
    } else {
      const dirty = pagesAll
        .map((p, i) => ({ p, prev: prev.pages[i] }))
        .filter(({ p, prev }) => !samePage(prev, p));
      if (dirty.length === 0 && prev.metaSig === metaSig && !opts?.flush) {
        return { ok: true, id: s.bookMeta.id ?? undefined }; // chẳng gì đổi → bỏ qua network
      }
      // objects (by _selId); backend merges into the stored canvasJson.
      payload.changedPages = dirty.map(({ p, prev: prevSnap }) => {
        const prevJson = prevSnap?.canvasJson ?? null;
        const d = diffPageObjects(prevJson, p.canvasJson);
        const nextCount = parsePageJson(p.canvasJson)?.objects?.length ?? 0;
        // màu nền nằm ngoài objects nên delta không mang theo — đổi màu thì gửi full trang.
        if (prevJson && samePageBackground(prevJson, p.canvasJson) && d.removed.length + d.changed.length < nextCount) {
          const rest: Record<string, unknown> = { ...p };
          delete rest.canvasJson;
          return { ...rest, changedObjects: d };
        }
        return p;
      });
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
}

function guardedSave(
  api: StudioAPI,
  token?: string,
  opts?: { flush?: boolean },
): Promise<{ ok: boolean; error?: string; id?: number }> {
  if (saveInflight) return saveInflight;
  saveInflight = runSaveFull(api, token, opts).finally(() => {
    saveInflight = null;
  });
  return saveInflight;
}

// saveFull already returns early with zero network when nothing changed, so an
// idle tab costs a local serialize per tick and nothing else.
export function useAutoSaveLoop(token?: string, intervalMs = 60_000, idleMs = 8_000) {
  const { saveFull, sendBeacon } = useAutoSave();
  const saveRef = useRef(saveFull);
  const tokenRef = useRef(token);
  const busyRef = useRef(false);
  const beaconRef = useRef(sendBeacon);
  // undoStack dài ra = có thao tác sửa (pushUndo chỉ push khi state khác).
  const undoDepth = useCanvasStore((s) => s.undoStack.length);

  useEffect(() => {
    saveRef.current = saveFull;
    tokenRef.current = token;
    beaconRef.current = sendBeacon;
  });

  useEffect(() => {
    if (!token) return;
    const tick = async () => {
      if (busyRef.current || !tokenRef.current) return;
      busyRef.current = true;
      try {
        await saveRef.current(tokenRef.current);
      } catch (err) {
        console.warn("[autosave] tick failed:", (err as Error)?.message || err);
      } finally {
        busyRef.current = false;
      }
    };
    const id = setInterval(tick, intervalMs);
    // đóng tab: fetch thường bị kill giữa chừng — beacon thì browser đảm bảo gửi.
    const flush = () => {
      if (busyRef.current) return;
      try {
        beaconRef.current();
      } catch {}
    };
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", flush);
    };
  }, [token, intervalMs]);

  // debounce sau thao tác cuối: sửa xong ~8s là save, khỏi chờ tick 60s.
  useEffect(() => {
    if (!token || undoDepth === 0) return;
    const id = setTimeout(() => {
      if (busyRef.current || !tokenRef.current) return;
      busyRef.current = true;
      saveRef
        .current(tokenRef.current)
        .catch((err) => console.warn("[autosave] idle save failed:", (err as Error)?.message || err))
        .finally(() => {
          busyRef.current = false;
        });
    }, idleMs);
    return () => clearTimeout(id);
  }, [token, undoDepth, idleMs]);
}

// Gói payload save hiện tại (đồng bộ, bỏ upload thumb) rồi beacon qua proxy
// same-origin (cookie đi kèm, backend merge như save thường, không cần response).
function sendBeaconSave(api: StudioAPI) {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;
  if (!api.beaconPath || !api.beaconTitleField) return;
  try {
    const s = useCanvasStore.getState();
    const c = s.canvas;
    const id = s.bookMeta.id;
    if (!c || !id) return;
    const pageCount = s.pages.length;
    const currentJson = serializeCanvasState(c);
    const updatedPages = [...s.pages];
    if (!isCoverPage(s.activePageIndex, pageCount) && c.getWidth() > 400) {
      const rightIdx = Math.min(s.activePageIndex + 1, pageCount - 1);
      const { leftJson, rightJson } = splitCanvasForView(
        currentJson,
        c.getWidth() / 2,
        s.viewMode,
        s.pages[s.activePageIndex]?.canvasJson,
        s.pages[rightIdx]?.canvasJson,
      );
      updatedPages[s.activePageIndex] = { ...updatedPages[s.activePageIndex], canvasJson: leftJson };
      updatedPages[rightIdx] = { ...updatedPages[rightIdx], canvasJson: rightJson };
    } else {
      updatedPages[s.activePageIndex] = { ...updatedPages[s.activePageIndex], canvasJson: currentJson };
    }
    const pagesAll = updatedPages.map((p) => ({
      index: p.index,
      layout: p.layout,
      spreadLayout: p.spreadLayout,
      canvasJson: p.canvasJson,
      thumbnailUrl: p.thumbnailUrl,
      locked: p.locked ?? false,
      elements: serializePage(p.canvasJson, p.index)?.elements ?? [],
    }));
    const fmt = resolveFormat({ format: s.bookMeta.format, width: s.bookMeta.width, height: s.bookMeta.height });
    const body = JSON.stringify({
      content: { pages: pagesAll },
      [api.beaconTitleField]: s.bookMeta.title,
      paperHeight: Math.round(fmt.height / 4),
      paperWidth: Math.round(fmt.width / 4),
    });
    navigator.sendBeacon(`/api/proxy?path=${encodeURIComponent(api.beaconPath(id))}`, new Blob([body], { type: "application/json" }));
  } catch {}
}

type PageSnapshot = {
  index: number;
  layout: unknown;
  spreadLayout: unknown;
  locked: unknown;
  canvasJson: string | null;
  thumbnailUrl: string | null;
};

const lastSavedBooks = new Map<string, { pages: PageSnapshot[]; metaSig: string }>();

function samePage(a: PageSnapshot | undefined, b: PageSnapshot): boolean {
  // cadence and must never mark a page dirty by themselves (phantom empty saves).
  return (
    !!a &&
    a.canvasJson === b.canvasJson &&
    a.layout === b.layout &&
    a.spreadLayout === b.spreadLayout &&
    a.locked === b.locked
  );
}

// sure no raw dataURL thumb is ever sent/stored; upload once, R2 URLs pass through.
async function remoteThumb(thumbnailUrl: string | null, token?: string): Promise<string | null> {
  if (!token || !thumbnailUrl || !thumbnailUrl.startsWith("data:")) return thumbnailUrl;
  try {
    const file = new File([await (await fetch(thumbnailUrl)).blob()], "thumb.jpg", { type: "image/jpeg" });
    return (await uploadToR2(file, "book-thumb", token)).url;
  } catch (err) {
    console.warn("[useAutoSave] thumb upload failed, keeping previous:", err);
    return thumbnailUrl;
  }
}
