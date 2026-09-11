import * as fabric from "fabric";

fabric.config.NUM_FRACTION_DIGITS = 2;

const MM_TO_PX = 4;

function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

export const DESIGN_W = 840,
  DESIGN_H = 1188,
  DESIGN_MARGIN_PX = 60;


function layoutMargin(pageW: number, pageH: number): number {
  const targetMin = Math.min(pageW, pageH);
  const mm = Math.max(8, 15 * Math.min(1, targetMin / DESIGN_W));
  return mm * MM_TO_PX;
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


const DROP_IF_DEFAULT: Record<string, unknown> = {
	visible: true,
	shadow: null,
	strokeDashArray: null,
	backgroundColor: "",
	paintFirst: "fill",
	fillRule: "nonzero",
	strokeUniform: false,
	objectCaching: true,
	flipX: false,
	flipY: false,
};
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
  // ponytail: toJSON neither propagates SERIALIZE_KEYS into group children nor
  // drops helpers there -- backfill recursively so grouped nodes keep identity.
  backfillCustomProps(
    parsed.objects,
    canvas.getObjects().filter((o: any) => !(o as any).excludeFromExport),
  );
  return JSON.stringify(parsed);
}

function backfillCustomProps(parsedObjs: any[], liveObjs: any[]) {
  parsedObjs.forEach((o: any, i: number) => {
    for (const k of Object.keys(DROP_IF_DEFAULT)) {
      if (o[k] === DROP_IF_DEFAULT[k]) delete o[k];
    }
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


export function splitCanvasByMidpoint(jsonStr: string, midpoint: number): { leftJson: string; rightJson: string } {
  const parsed = JSON.parse(jsonStr);
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
  const mkJson = (objs: any[]) => JSON.stringify({ ...parsed, objects: objs });
  return { leftJson: mkJson(leftObjs), rightJson: mkJson(rightObjs) };
}

