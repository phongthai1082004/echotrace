"use client";

import { create } from 'zustand';
import type { Canvas as FabricCanvas } from 'fabric';
import { navItems } from '../types/menu'
import type { PageState, FormatKey } from "../types";
import type { LayoutConfig } from "../types/layout";
import { serializeCanvasState } from "../lib/layout-engine";

type BookMeta = {
  id: number | null;
  title: string;
  themeId: number | null;
  format: string;
  gsm: number;
  paper: string;
  kind?: "ALBUM" | "TEMPLATE";
  width?: number | null;
  height?: number | null;
};

export type UndoEntry = {
  type: "canvas";
  pageIdx: number;
  canvasJson: string;
} | {
  type: "pages";
  pages: PageState[];
  activePageIndex: number;
  activeLayout: LayoutConfig | null;
  viewMode: "left" | "right" | "spread";
};

interface CanvasStore {
  canvas: FabricCanvas | null;
  setCanvas: (c: FabricCanvas | null) => void;
  activeMenu: string;
  setActiveMenu: (m: string) => void;
  activePageIndex: number;
  setActivePageIndex: (i: number) => void;
  pages: PageState[];
  setPages: (p: PageState[]) => void;
  setPage: (i: number, p: Partial<PageState>) => void;
  bookMeta: BookMeta;
  setBookMeta: (m: Partial<BookMeta>) => void;
  undoStack: UndoEntry[];
  pushUndo: () => void;
  pushUndoPages: () => void;
  undoVersion: number;
  redoStack: UndoEntry[];
  pushRedo: (entry: UndoEntry) => void;
  popRedo: () => UndoEntry | undefined;
  popUndo: () => UndoEntry | undefined;
  clearRedo: () => void;
  zoomIndex: number;
  setZoomIndex: (i: number) => void;
  filterVersion: number;
  incrementFilterVersion: () => void;
  selectionVersion: number;
  incrementSelectionVersion: () => void;
  incrementUndoVersion: () => void;
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
    { index: 0, canvasJson: null, thumbnailUrl: null, layout: null, spreadLayout: null },
    { index: 1, canvasJson: null, thumbnailUrl: null, layout: null, spreadLayout: null },
  ],
  bookMeta: { id: null, title: "Untitled", themeId: null, format: "PORTRAIT_A4", gsm: 200, paper: "matte", kind: "TEMPLATE" },
  undoStack: [],
  undoVersion: 0,
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
  undoStack: [] as UndoEntry[],
  pushUndo: () => {
    const { canvas, undoStack, activePageIndex } = get();
    if (!canvas) return;
    const json = serializeCanvasState(canvas);
    const entry: UndoEntry = { type: "canvas", pageIdx: activePageIndex, canvasJson: json };
    const lastEntry = undoStack[undoStack.length - 1];
    if (lastEntry?.type === "canvas" && lastEntry.canvasJson === json && lastEntry.pageIdx === activePageIndex) return;
    const stack = [...undoStack, entry].slice(-50);
    set({ undoStack: stack });
  },
  pushUndoPages: () => {
    const { pages, activePageIndex, activeLayout, viewMode, undoStack } = get();
    const entry: UndoEntry = { type: "pages", pages: JSON.parse(JSON.stringify(pages)), activePageIndex, activeLayout, viewMode };
    const stack = [...undoStack, entry].slice(-50);
    set({ undoStack: stack });
  },
  redoStack: [] as UndoEntry[],
  pushRedo: (entry) => set((st) => ({ redoStack: [...st.redoStack, entry].slice(-50) })),
  popRedo: () => {
    const stack = [...get().redoStack];
    const val = stack.pop();
    set({ redoStack: stack, undoVersion: get().undoVersion + 1 });
    return val;
  },
  popUndo: () => {
    const stack = [...get().undoStack];
    const val = stack.pop();
    set({ undoStack: stack, undoVersion: get().undoVersion + 1 });
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
  incrementUndoVersion: () => set((s) => ({ undoVersion: s.undoVersion + 1 })),
  setAutoPlaced: (v) => set({ autoPlaced: v }),
  setViewMode: (v) => set({ viewMode: v }),
  resetStore: () => set({ ...INITIAL_STATE }),
}));
