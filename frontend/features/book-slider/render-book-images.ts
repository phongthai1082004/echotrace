"use client";

import * as fabric from "fabric";
import type { PageState, PaperFormat } from "../studio-canvas/types";
import { reviveObject } from "../studio-canvas/lib/layout-engine";

export type BookPageImage = { src: string; width: number; height: number };

// ponytail: renders each stored single page at fmt.width×fmt.height. Covers are
// 1 image each; interiors are already split per-page in the store (splitCanvasByMidpoint),
// so each spread naturally becomes 2 images. Fall back to stored thumbnail on taint.
export async function renderBookImages(
  pages: PageState[],
  fmt: PaperFormat,
): Promise<BookPageImage[]> {
  const out: BookPageImage[] = [];
  for (const p of pages) {
    out.push({ src: await renderOne(p.canvasJson, fmt.width, fmt.height, p.thumbnailUrl), width: fmt.width, height: fmt.height });
  }
  return out;
}

async function renderOne(jsonStr: string | null, width: number, height: number, fallback: string | null): Promise<string> {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  const ctx = el.getContext("2d");
  ctx!.fillStyle = "#fff";
  ctx!.fillRect(0, 0, width, height);
  if (jsonStr) {
    const fc = new fabric.Canvas(el, { backgroundColor: "#fff", preserveObjectStacking: true });
    try {
      await fc.loadFromJSON(JSON.parse(jsonStr), reviveObject).catch(() => {});
      fc.renderAll();
      return fc.toDataURL({ format: "jpeg", quality: 0.85, multiplier: 1 });
    } catch {
      // ponytail: skip tainted canvas, keep white/thumbnail
    } finally {
      fc.dispose();
    }
  }
  if (fallback) return fallback;
  return el.toDataURL("image/jpeg", 0.85);
}

export type Sheet = { front: string; back: string };

export function buildSheets(images: BookPageImage[]): Sheet[] {
  const sheets: Sheet[] = [];
  for (let i = 0; i + 1 < images.length; i += 2) {
    sheets.push({ front: images[i].src, back: images[i + 1].src });
  }
  return sheets;
}
