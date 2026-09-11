// ponytail: normalize Fabric canvasJson -> mm-based, top-left-origin element list so pdf-lib
// can render without parsing Fabric internals. canvasJson is kept for the editor (old optimization).
import { PX_PER_MM, PT_PER_PX } from "./unit-conversion";
export { PX_PER_MM, PT_PER_MM, PT_PER_PX } from "./unit-conversion";

export type BookElement =
	| {
			type: "image";
			x: number;
			y: number;
			width: number;
			height: number;
			ref: string;
			fit: "cover" | "fill" | "contain";
			opacity?: number;
			rotation?: number;
	  }
	| {
			type: "text";
			x: number;
			y: number;
			width: number;
			height: number;
			text: string;
			fontSizePt: number;
			fontFamily?: string;
			color?: string;
			align?: string;
	  }
	| {
			type: "rect";
			x: number;
			y: number;
			width: number;
			height: number;
			fill?: string;
			stroke?: string;
			strokeWidthMm?: number;
	  };

export interface PageContent {
	index: number;
	widthMm: number;
	heightMm: number;
	elements: BookElement[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function bboxPx(o: any) {
	const w = (o.width || 0) * (o.scaleX || 1);
	const h = (o.height || 0) * (o.scaleY || 1);
	const ox = o.originX || "left";
	const oy = o.originY || "top";
	const x = (o.left || 0) - (ox === "center" ? w / 2 : ox === "right" ? w : 0);
	const y = (o.top || 0) - (oy === "center" ? h / 2 : oy === "bottom" ? h : 0);
	return { x, y, w, h };
}

export function serializePage(canvasJson: string | null, index: number): PageContent | null {
	if (!canvasJson) return null;
	let parsed: any;
	try {
		parsed = JSON.parse(canvasJson);
	} catch {
		return null;
	}
	const widthMm = r2((parsed.width || 0) / PX_PER_MM);
	const heightMm = r2((parsed.height || 0) / PX_PER_MM);
	const elements: BookElement[] = [];

	for (const o of parsed.objects || []) {
		if (o.excludeFromExport || o.visible === false) continue;
		const layer = o.customProperties?.layer;
		if (layer === "overlay" || layer === "dimOverlay") continue;
		const { x, y, w, h } = bboxPx(o);
		const ex = r2(x / PX_PER_MM);
		const ey = r2(y / PX_PER_MM);
		const ew = r2(w / PX_PER_MM);
		const eh = r2(h / PX_PER_MM);

		if (o.type === "image") {
			if (!o.src) continue;
			elements.push({
				type: "image",
				x: ex,
				y: ey,
				width: ew,
				height: eh,
				ref: o.src,
				fit: o.clipPath ? "cover" : "fill",
				opacity: o.opacity ?? 1,
				rotation: o.angle || 0,
			});
		} else if (o.type === "text" || o.type === "i-text" || o.type === "textbox") {
			elements.push({
				type: "text",
				x: ex,
				y: ey,
				width: ew,
				height: eh,
				text: o.text || "",
				fontSizePt: r2((o.fontSize || 12) * PT_PER_PX),
				fontFamily: o.fontFamily,
				color: typeof o.fill === "string" ? o.fill : "#000",
				align: o.textAlign || "left",
			});
		} else if (o.type === "rect") {
			if (layer === "frame") continue; // guide frames are invisible in print
			const fill = typeof o.fill === "string" && o.fill !== "rgba(0,0,0,0.01)" ? o.fill : undefined;
			const stroke = typeof o.stroke === "string" && o.stroke !== "transparent" ? o.stroke : undefined;
			if (!fill && !stroke) continue;
			elements.push({
				type: "rect",
				x: ex,
				y: ey,
				width: ew,
				height: eh,
				fill,
				stroke,
				strokeWidthMm: o.strokeWidth ? r2(o.strokeWidth / PX_PER_MM) : undefined,
			});
		}
		// ponytail: groups/paths skipped in v1; add flattening if grouping is used in the wild
	}

	return { index, widthMm, heightMm, elements };
}
