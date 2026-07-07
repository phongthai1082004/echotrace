"use client";

import { useState, useCallback } from "react";
import type { CanvasElement } from "../types";
import { initialElements } from "../types";

export function useCanvasState() {
  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<CanvasElement[][]>([initialElements]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const pushHistory = useCallback(
    (next: CanvasElement[]) => {
      const trimmed = history.slice(0, historyIdx + 1);
      trimmed.push(next);
      setHistory(trimmed);
      setHistoryIdx(trimmed.length - 1);
      setElements(next);
    },
    [history, historyIdx],
  );

  const undo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setElements(history[historyIdx - 1]);
    }
  };

  const redo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setElements(history[historyIdx + 1]);
    }
  };

  const addText = () => {
    const el: CanvasElement = {
      id: `el-${Date.now()}`,
      type: "text",
      x: 80, y: 100, width: 320, height: 90,
      content: "New Text Block",
      fontSize: 28,
      fontFamily: "Playfair Display",
      zIndex: elements.length + 1,
    };
    pushHistory([...elements, el]);
    setSelectedId(el.id);
  };

  const addImage = (url?: string) => {
    const el: CanvasElement = {
      id: `el-${Date.now()}`,
      type: "image",
      x: 180, y: 140, width: 300, height: 400,
      content: "",
      zIndex: elements.length + 1,
      imageUrl: url ?? "https://images.unsplash.com/photo-1757679789909-29f58dfd065b?w=600&h=800&fit=crop&auto=format",
    };
    pushHistory([...elements, el]);
    setSelectedId(el.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    pushHistory(elements.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  const updateElement = (id: string, patch: Partial<CanvasElement>) => {
    const next = elements.map((el) => el.id === id ? { ...el, ...patch } : el);
    pushHistory(next);
  };

  const moveElement = (id: string, x: number, y: number) => {
    setElements((prev) => prev.map((el) => el.id === id ? { ...el, x, y } : el));
  };

  return {
    elements, selectedId, setSelectedId, history, historyIdx,
    pushHistory, undo, redo, addText, addImage, deleteSelected, updateElement, moveElement,
  };
}
