"use client";

import { create } from 'zustand';
import * as fabric from 'fabric';
import { navItems } from '../types/menu'

import { useState, useCallback } from "react";
import type { CanvasElement } from "../types";
import { initialElements } from "../types";

interface CanvasState {
  canvas: fabric.Canvas | null; setCanvas: (newCanvas: fabric.Canvas | null) => void
  activeMenu: string; setActiveMenu: (newActiveMenu: string) => void
}
export const useCanvasStore = create<CanvasState>((set) => ({
  canvas: null, setCanvas: (newCanvas) => set({canvas: newCanvas}),
  activeMenu: navItems[0]?.label, setActiveMenu: (newActiveMenu) => set({activeMenu: newActiveMenu})
}));
