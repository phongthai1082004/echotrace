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
  ...(INITIAL_STATE as unknown as CanvasStore),
  setCanvas: (c) => set({ canvas: c }),
  setActiveMenu: (m) => set({ activeMenu: m }),
  setActivePageIndex: (i) => set({ activePageIndex: i }),
  setPages: (p) => set({ pages: p }),
  setPage: (i, partial) => set((s) => {
    const pages = [...s.pages];
    pages[i] = { ...pages[i], ...partial };
    return { pages };
  }),
  setBookMeta: (m) => set((s) => ({ bookMeta: { ...s.bookMeta, ...m } })),
  undoStack: [] as { pageIdx: number; canvasJson: string }[],
  pushUndo: () => {
    const { canvas, undoStack, activePageIndex } = get();
    if (!canvas) return;
    
    // Capture current canvas state
    const json = serializeCanvasState(canvas);
    const entry = { pageIdx: activePageIndex, canvasJson: json };
    
    // Compare with last undo entry - don't add if identical (debounce)
    const lastEntry = undoStack[undoStack.length - 1];
    if (lastEntry?.canvasJson === json && lastEntry?.pageIdx === activePageIndex) return;
    
    const stack = [...undoStack, entry].slice(-50);
    set({ undoStack: stack });
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
  setZoomIndex: (i) => set({ zoomIndex: i }),
  incrementFilterVersion: () => set((s) => ({ filterVersion: s.filterVersion + 1 })),
  incrementSelectionVersion: () => set((s) => ({ selectionVersion: s.selectionVersion + 1 })),
  setFilterSliderValues: (vals) => set({ filterSliderValues: vals }),
  setActiveLayout: (l) => {
    const { activePageIndex, setPage } = get();
    setPage(activePageIndex, { layout: l });
    set({ activeLayout: l });
  },
  setIsDraggingPhoto: (v) => set({ isDraggingPhoto: v }),
  setClipboard: (s) => set({ clipboard: s }),
  resetPasteCount: () => set({ pasteCount: 0 }),
  bumpPasteCount: () => set((s) => ({ pasteCount: s.pasteCount + 1 })),
  incrementLayerVersion: () => set((s) => ({ layerVersion: s.layerVersion + 1 })),
  setAutoPlaced: (v) => set({ autoPlaced: v }),
  setViewMode: (v) => set({ viewMode: v }),
  resetStore: () => set({ ...INITIAL_STATE }),
}));
