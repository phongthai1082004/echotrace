"use client";

import { create } from 'zustand';
import * as fabric from 'fabric';
import { navItems } from '../types/menu'
import type { PageState, FormatKey } from "../types";
import { FORMATS } from "../types";

type BookMeta = {
  id: number | null;
  title: string;
  themeId: number | null;
  format: FormatKey;
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
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  bookMeta: BookMeta;
  setBookMeta: (m: Partial<BookMeta>) => void;
  undoStack: string[];
  pushUndo: () => void;
  redoStack: string[];
  pushRedo: (s: string) => void;
  popRedo: () => string | undefined;
  popUndo: () => string | undefined;
  clearRedo: () => void;
  zoomIndex: number;
  setZoomIndex: (i: number) => void;
}

const defaultLayoutId = "full-bleed";

const initialPage: PageState = {
  index: 0,
  canvasJson: null,
  thumbnailUrl: null,
  layoutId: defaultLayoutId,
};

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  canvas: null,
  setCanvas: (c) => set({ canvas: c }),
  activeMenu: navItems[0]?.label || "Templates",
  setActiveMenu: (m) => set({ activeMenu: m }),
  activePageIndex: 0,
  setActivePageIndex: (i) => set({ activePageIndex: i }),
  pages: [initialPage],
  setPages: (p) => set({ pages: p }),
  setPage: (i, partial) => set((s) => {
    const pages = [...s.pages];
    pages[i] = { ...pages[i], ...partial };
    return { pages };
  }),
  selectedElementId: null,
  setSelectedElementId: (id) => set({ selectedElementId: id }),
  bookMeta: { id: null, title: "Untitled", themeId: null, format: "A4_PORTRAIT" },
  setBookMeta: (m) => set((s) => ({ bookMeta: { ...s.bookMeta, ...m } })),
  undoStack: [],
  pushUndo: () => {
    const { canvas, undoStack } = get();
    if (!canvas) return;
    const json = JSON.stringify((canvas as any).toJSON(["z", "slotIndex", "layer"]));
    const stack = [...undoStack, json].slice(-50);
    set({ undoStack: stack });
  },
  redoStack: [],
  pushRedo: (s) => set((st) => ({ redoStack: [...st.redoStack, s].slice(-50) })),
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
}));
