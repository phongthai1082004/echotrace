import * as fabric from "fabric";
import { PX_PER_MM, mmToPx } from "./unit-conversion";
import { stripSparsePage, parsePageJson } from "./sparse-json";

fabric.config.NUM_FRACTION_DIGITS = 2;

export const DESIGN_W = 840,
  DESIGN_H = 1188,
  DESIGN_MARGIN_PX = 60;


function layoutMargin(pageW: number, pageH: number): number {
  const targetMin = Math.min(pageW, pageH);
  const mm = Math.max(8, 15 * Math.min(1, targetMin / DESIGN_W));
  return mm * PX_PER_MM;
}


export function layoutSlotTransform(
  slot: { left: number; top: number; width: number; height: number },
  opts: { pageWidth: number; pageHeight: number; kind?: "single" | "spread"; offsetX?: number },
): { left: number; top: number; width: number; height: number } {
  const { pageWidth: pw, pageHeight: ch, kind, offsetX = 0 } = opts;
  const spread = kind === "spread";
  const designW = spread ? DESIGN_W * 2 : DESIGN_W;

  const targetW = spread ? pw * 2 : pw;
  const margin = layoutMargin(pw, ch);
  const sx = (targetW - margin * 2) / (designW - DESIGN_MARGIN_PX * 2);
  const sy = (ch - margin * 2) / (DESIGN_H - DESIGN_MARGIN_PX * 2);
  return {
    left: margin + (mmToPx(slot.left) - DESIGN_MARGIN_PX) * sx + offsetX,
    top: margin + (mmToPx(slot.top) - DESIGN_MARGIN_PX) * sy,
    width: mmToPx(slot.width) * sx,
    height: mmToPx(slot.height) * sy,
  };
}


const SERIALIZE_KEYS = [
  "z",
  "layer",
  "customProperties",
  "_selId",
  "selectable",
  "evented",
  "hasControls",
  "hasBorders",
];


export function serializeCanvasState(canvas: fabric.Canvas): string {
  const parsed = (canvas as any).toJSON(SERIALIZE_KEYS) as { objects: any[]; width?: number; height?: number };
	// PDF render needs the real page ratio -- fabric toJSON drops viewport dims
	parsed.width = canvas.getWidth();
	parsed.height = canvas.getHeight();
  // drops helpers there -- backfill recursively so grouped nodes keep identity.
  backfillCustomProps(
    parsed.objects,
    canvas.getObjects().filter((o: any) => !(o as any).excludeFromExport),
  );
  stripSparsePage(parsed);
  return JSON.stringify(parsed);
}

function backfillCustomProps(parsedObjs: any[], liveObjs: any[]) {
  parsedObjs.forEach((o: any, i: number) => {
    const live = liveObjs[i];
    if (!live) return;
    o.customProperties = (live as any).customProperties;
    o._selId = (live as any)._selId;
    if (Array.isArray(o.objects) && Array.isArray((live as any)._objects)) {
      backfillCustomProps(o.objects, (live as any)._objects);
    }
  });
}


export function isCoverPage(index: number, total: number): boolean {
  return index === 0 || index === total - 1 || total <= 2;
}

export function isPageLocked(pages: { locked?: boolean }[], index: number): boolean {
  if (pages[index]?.locked) return true;
  const n = pages.length;
  if (!isCoverPage(index, n) && pages[Math.min(index + 1, n - 1)]?.locked) return true;
  return false;
}


export function splitCanvasByMidpoint(
  jsonStr: string,
  midpoint: number,
  // L/R view: nửa không focus giữ màu đã lưu, chỉ nửa focus ăn màu mới; 2P đổi cả hai.
  bg?: { left?: unknown; right?: unknown },
): { leftJson: string; rightJson: string } {
  const parsed = parsePageJson(jsonStr) ?? { objects: [] };
  const leftObjs: any[] = [],
    rightObjs: any[] = [];
  parsed.objects?.forEach((o: any) => {
    if ((o.left || 0) < midpoint) {
      leftObjs.push(o);
    } else {
      o.left = (o.left || 0) - midpoint;
      rightObjs.push(o);
    }
  });
  const mkJson = (objs: any[], background?: unknown) => {
    const half = { ...parsed, objects: objs };
    if (background !== undefined) half.background = background;
    stripSparsePage(half);
    return JSON.stringify(half);
  };
  return { leftJson: mkJson(leftObjs, bg?.left), rightJson: mkJson(rightObjs, bg?.right) };
}

export function pageBackground(canvasJson: string | null | undefined): unknown {
  if (!canvasJson) return undefined;
  try {
    return (JSON.parse(canvasJson) as any)?.background;
  } catch {
    return undefined;
  }
}

export function samePageBackground(a: string | null | undefined, b: string | null | undefined): boolean {
  return JSON.stringify(pageBackground(a) ?? null) === JSON.stringify(pageBackground(b) ?? null);
}

export function splitCanvasForView(
  jsonStr: string,
  midpoint: number,
  viewMode: "left" | "right" | "spread",
  leftStoredJson: string | null | undefined,
  rightStoredJson: string | null | undefined,
): { leftJson: string; rightJson: string } {
  return splitCanvasByMidpoint(jsonStr, midpoint, {
    left: viewMode === "right" ? pageBackground(leftStoredJson) : undefined,
    right: viewMode === "left" ? pageBackground(rightStoredJson) : undefined,
  });
}

