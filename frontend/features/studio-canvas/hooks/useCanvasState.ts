"use client";

import { create } from 'zustand';
import * as fabric from 'fabric';
import { navItems } from '../types/menu'
import type { PageState, FormatKey } from "../types";
import type { LayoutConfig } from "../types/layout";
import { serializeCanvasState } from "../lib/layout-engine";

type BookMeta = {
  id: number | null;
  title: string;
  themeId: number | null;
  format: FormatKey;
  gsm: number;
  paperType: string;
  bindingType: "perfect" | "layflat";
};

interface CanvasStore {
  canvas: fabric.Canvas | null;
  setCanvas: (c: fabric.Canvas | null) => void;
  activeMenu: string;
  setActiveMenu: (m: string) => void;
  activePageIndex: number;
  setActivePageIndex: (i: number) => void;
  pages: PageState[];
  setPages: (p: PageState[]) => void;
  setPage: (i: number, p: Partial<PageState>) => void;
  bookMeta: BookMeta;
  setBookMeta: (m: Partial<BookMeta>) => void;
  undoStack: { pageIdx: number; canvasJson: string }[];
  pushUndo: () => void;
  redoStack: { pageIdx: number; canvasJson: string }[];
  pushRedo: (entry: { pageIdx: number; canvasJson: string }) => void;
  popRedo: () => { pageIdx: number; canvasJson: string } | undefined;
  popUndo: () => { pageIdx: number; canvasJson: string } | undefined;
  clearRedo: () => void;
  zoomIndex: number;
  setZoomIndex: (i: number) => void;
  filterVersion: number;
  incrementFilterVersion: () => void;
  selectionVersion: number;
  incrementSelectionVersion: () => void;
  filterSliderValues: { Brightness: number; Contrast: number; Saturation: number; Vibrance: number };
  setFilterSliderValues: (vals: { Brightness: number; Contrast: number; Saturation: number; Vibrance: number }) => void;
  activeLayout: LayoutConfig | null;
  setActiveLayout: (l: LayoutConfig | null) => void;
  isDraggingPhoto: boolean;
  setIsDraggingPhoto: (v: boolean) => void;
  clipboard: string | null;
  setClipboard: (s: string | null) => void;
  pasteCount: number;
  resetPasteCount: () => void;
  bumpPasteCount: () => void;
  layerVersion: number;
  incrementLayerVersion: () => void;
  autoPlaced: boolean;
  setAutoPlaced: (v: boolean) => void;
  viewMode: "left" | "right" | "spread";
  setViewMode: (v: "left" | "right" | "spread") => void;
  resetStore: () => void;
}

const INITIAL_STATE: Partial<CanvasStore> = {
  canvas: null,
  activeMenu: navItems[0]?.label || "Templates",
  activePageIndex: 0,
  pages: [
    { index: 0, canvasJson: null, thumbnailUrl: null, layout: null },
    { index: 1, canvasJson: null, thumbnailUrl: null, layout: null },
  ],
  bookMeta: { id: null, title: "Untitled", themeId: null, format: "A4_PORTRAIT", gsm: 200, paperType: "matte", bindingType: "perfect" },
  undoStack: [],
  redoStack: [],
  zoomIndex: 3,
  filterVersion: 0,
  selectionVersion: 0,
  filterSliderValues: { Brightness: 0, Contrast: 0, Saturation: 0, Vibrance: 0 },
  activeLayout: null,
  isDraggingPhoto: false,
  clipboard: null,
  pasteCount: 0,
  layerVersion: 0,
  autoPlaced: false,
  viewMode: "left",
};

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  canvas: null,
  setCanvas: (c) => set({ canvas: c }),
  activeMenu: navItems[0]?.label || "Templates",
  setActiveMenu: (m) => set({ activeMenu: m }),
  activePageIndex: 0,
  setActivePageIndex: (i) => set({ activePageIndex: i }),
  pages: [
    { index: 0, canvasJson: null, thumbnailUrl: null, layout: null },
    { index: 1, canvasJson: null, thumbnailUrl: null, layout: null },
  ],
  setPages: (p) => set({ pages: p }),
  setPage: (i, partial) => set((s) => {
    const pages = [...s.pages];
    pages[i] = { ...pages[i], ...partial };
    return { pages };
  }),
  bookMeta: { id: null, title: "Untitled", themeId: null, format: "A4_PORTRAIT", gsm: 200, paperType: "matte", bindingType: "perfect" },
  setBookMeta: (m) => set((s) => ({ bookMeta: { ...s.bookMeta, ...m } })),
  undoStack: [] as { pageIdx: number; canvasJson: string }[],
  pushUndo: () => {
    const { canvas, undoStack, activePageIndex } = get();
    if (!canvas) { console.log("pushUndo: no canvas"); return; }
    if (canvas.getObjects().some((o: any) => o.customProperties?.layer === "photo" && (o as any).hasControls === true)) { console.log("pushUndo: photo unlocked, skip"); return; }
    const json = serializeCanvasState(canvas);
    const entry = { pageIdx: activePageIndex, canvasJson: json };
    const stack = [...undoStack, entry].slice(-50);
    set({ undoStack: stack });
    console.log(`pushUndo: pg${activePageIndex} stack=${stack.length}`);
  },
  redoStack: [] as { pageIdx: number; canvasJson: string }[],
  pushRedo: (entry) => set((st) => ({ redoStack: [...st.redoStack, entry].slice(-50) })),
  popRedo: () => {
    const stack = [...get().redoStack];
    const val = stack.pop();
    set({ redoStack: stack });
    return val;
  },
  popUndo: () => {
    const stack = [...get().undoStack];
    const val = stack.pop();
    set({ undoStack: stack });
    return val;
  },
  clearRedo: () => set({ redoStack: [] }),
  zoomIndex: 3,
  setZoomIndex: (i) => set({ zoomIndex: i }),
  filterVersion: 0,
  incrementFilterVersion: () => set((s) => ({ filterVersion: s.filterVersion + 1 })),
  selectionVersion: 0,
  incrementSelectionVersion: () => set((s) => ({ selectionVersion: s.selectionVersion + 1 })),
  filterSliderValues: { Brightness: 0, Contrast: 0, Saturation: 0, Vibrance: 0 },
  setFilterSliderValues: (vals) => set({ filterSliderValues: vals }),
  activeLayout: null,
  setActiveLayout: (l) => {
    const { activePageIndex, setPage } = get();
    setPage(activePageIndex, { layout: l });
    set({ activeLayout: l });
  },
  isDraggingPhoto: false,
  setIsDraggingPhoto: (v) => set({ isDraggingPhoto: v }),
  clipboard: null,
  setClipboard: (s) => set({ clipboard: s }),
  pasteCount: 0,
  resetPasteCount: () => set({ pasteCount: 0 }),
  bumpPasteCount: () => set((s) => ({ pasteCount: s.pasteCount + 1 })),
  layerVersion: 0,
  incrementLayerVersion: () => set((s) => ({ layerVersion: s.layerVersion + 1 })),
  autoPlaced: false,
  setAutoPlaced: (v) => set({ autoPlaced: v }),
  viewMode: "left",
  setViewMode: (v) => set({ viewMode: v }),
  resetStore: () => set({ ...INITIAL_STATE }),
}));
