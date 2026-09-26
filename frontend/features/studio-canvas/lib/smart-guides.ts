import * as fabric from "fabric";

/**
 * Smart guides -- alignment + snapping + equal-distribute spacing while moving objects.
 *
 * Priority per axis: DISTRIBUTE (equal gaps between neighbors) beats alignment --
 * otherwise dense neighbor edges always win and distribute never fires.
 *
 * Optimizations:
 *  - candidates cached, rebuilt only on structural events (never per mousemove)
 *  - ActiveSelection / Group count as ONE object (their bounding box)
 *  - rAF batching (collapse mousemove bursts), setCoords only on actual snap
 *  - reusable guide lines (show/hide), zero object churn per frame
 *  - candidate cap for huge canvases (page-line-only fallback)
 */

const SNAP_THRESHOLD = 6;
const DISTRIBUTE_THRESHOLD = 8;
const NEIGHBOR_SEARCH = 300;
const MAX_CANDIDATE_OBJECTS = 150;

interface GuideLine extends fabric.Line {
	__smartGuide?: boolean;
}

interface GuideCache {
	v: number[];
	h: number[];
	others: { obj: fabric.FabricObject; rect: { left: number; top: number; right: number; bottom: number } }[];
}

export function attachSmartGuides(canvas: fabric.Canvas) {
	let alignV: GuideLine | null = null;
	let alignH: GuideLine | null = null;
	const gapPool: GuideLine[] = [];
	let gapUsed = 0;
	let cache: GuideCache | null = null;
	let dirty = true;

	const isHelper = (o: any) => o.__smartGuide || o._dragOverlay || o.excludeFromExport;

	const clear = () => {
		alignV?.set({ visible: false });
		alignH?.set({ visible: false });
		gapPool.forEach((l) => l.set({ visible: false }));
		gapUsed = 0;
		canvas.requestRenderAll();
	};

	const ensureAlign = (vertical: boolean): GuideLine => {
		const existing = vertical ? alignV : alignH;
		if (existing && canvas.getObjects().includes(existing)) return existing;
		const w = canvas.getWidth();
		const h = canvas.getHeight();
		const line = new fabric.Line(
			vertical ? [0, 0, 0, h] : [0, 0, w, 0],
			{
				stroke: "#4A90D9",
				strokeWidth: 1,
				strokeDashArray: [4, 4],
				selectable: false,
				evented: false,
				excludeFromExport: true,
				visible: false,
			},
		) as GuideLine;
		(line as any).__smartGuide = true;
		canvas.add(line);
		canvas.sendObjectToBack(line);
		if (vertical) alignV = line;
		else alignH = line;
		return line;
	};

	const ensureGap = (): GuideLine => {
		if (gapUsed < gapPool.length) {
			const l = gapPool[gapUsed];
			if (canvas.getObjects().includes(l)) {
				gapUsed++;
				return l;
			}
		}
		const line = new fabric.Line([0, 0, 0, 0], {
			stroke: "#4A90D9",
			strokeWidth: 1,
			strokeDashArray: [4, 4],
			selectable: false,
			evented: false,
			excludeFromExport: true,
			visible: false,
		}) as GuideLine;
		(line as any).__smartGuide = true;
		canvas.add(line);
		canvas.sendObjectToBack(line);
		gapPool.push(line);
		gapUsed++;
		return line;
	};

	const drawXGap = (x1: number, x2: number, cy: number) => {
		const a = Math.min(x1, x2),
			b = Math.max(x1, x2);
		ensureGap().set({ x1: a, y1: cy, x2: b, y2: cy, visible: true });
	};

	const drawYGap = (y1: number, y2: number, cx: number) => {
		const a = Math.min(y1, y2),
			b = Math.max(y1, y2);
		ensureGap().set({ x1: cx, y1: a, x2: cx, y2: b, visible: true });
	};

	// and stale oCoords shift edges by 0.5px, which silently breaks threshold math.
	const snapRound = (n: number): number => Math.round(n);

	const collectCandidates = (moving: fabric.FabricObject): GuideCache => {
		const cw = canvas.getWidth();
		const ch = canvas.getHeight();
		const v = [0, cw / 2, cw];
		const h = [0, ch / 2, ch];
		const movingSet = new Set<any>([moving]);
		if ((moving as any).type === "activeselection" || (moving as any).type === "group") {
			(moving as any).getObjects().forEach((o: any) => movingSet.add(o));
		}
		const others: GuideCache["others"] = [];
		const all = canvas.getObjects().filter((o: any) => !movingSet.has(o) && !isHelper(o));
		if (all.length <= MAX_CANDIDATE_OBJECTS) {
			for (const o of all) {
				const b = (o as any).getBoundingRect(true, true);
				const rect = {
					left: snapRound(b.left),
					top: snapRound(b.top),
					right: snapRound(b.left + b.width),
					bottom: snapRound(b.top + b.height),
				};
				others.push({ obj: o, rect });
				v.push(rect.left, (rect.left + rect.right) / 2, rect.right);
				h.push(rect.top, (rect.top + rect.bottom) / 2, rect.bottom);
			}
		}
		return { v, h, others };
	};

	let rafId: number | null = null;
	let lastEvent: any = null;

	const onMoving = (e: any) => {
		lastEvent = e;
		if (rafId != null) return;
		rafId = requestAnimationFrame(() => {
			rafId = null;
			if (lastEvent) doSnap(lastEvent);
		});
	};

	const doSnap = (e: any) => {
		const target = e.target as fabric.FabricObject;
		if (!target || isHelper(target)) {
			clear();
			return;
		}
		// before the dirty rebuild, so cache stayed null forever and nothing snapped.
		if (dirty || !cache) {
			cache = collectCandidates(target);
			dirty = false;
		}
		// stale red segments pile up on canvas and spacing looks random.
		gapPool.forEach((l) => l.set({ visible: false }));
		gapUsed = 0;

		const rect = (target as any).getBoundingRect(true, true);
		const mb = {
			left: snapRound(rect.left),
			top: snapRound(rect.top),
			right: snapRound(rect.left + rect.width),
			bottom: snapRound(rect.top + rect.height),
			width: snapRound(rect.width),
			height: snapRound(rect.height),
		};
		const cy = mb.top + mb.height / 2;
		const cx = mb.left + mb.width / 2;

		let dx = 0;
		let dy = 0;
		let showAlignV: number | null = null;
		let showAlignH: number | null = null;
		let spacingShown = false;

		// ===== DISTRIBUTE first (equal gaps beat alignment) =====
		// X axis: neighbors with vertical overlap, nearest left + nearest right
		let leftN: GuideCache["others"][number] | null = null;
		let rightN: GuideCache["others"][number] | null = null;
		for (const o of cache.others) {
			const b = o.rect;
			if (b.bottom < mb.top - SNAP_THRESHOLD || b.top > mb.bottom + SNAP_THRESHOLD) continue;
			if (b.right <= mb.left + SNAP_THRESHOLD && b.right > mb.left - NEIGHBOR_SEARCH) {
				if (!leftN || b.right > leftN.rect.right) leftN = o;
			}
			if (b.left >= mb.right - SNAP_THRESHOLD && b.left < mb.right + NEIGHBOR_SEARCH) {
				if (!rightN || b.left < rightN.rect.left) rightN = o;
			}
		}
		let distrX = false;
		if (leftN && rightN) {
			const gapL = mb.left - leftN.rect.right;
			const gapR = rightN.rect.left - mb.right;
			if (gapL >= -SNAP_THRESHOLD && gapR >= -SNAP_THRESHOLD) {
				distrX = true;
				const targetLeft = (rightN.rect.left + leftN.rect.right - mb.width) / 2;
				const d = targetLeft - mb.left;
				// origin (direct left= assignment breaks center-origin objects).
				if (Math.abs(d) <= DISTRIBUTE_THRESHOLD && d !== 0) {
					dx = d;
				}
				if (Math.abs(gapL - gapR) <= DISTRIBUTE_THRESHOLD) {
					drawXGap(leftN.rect.right, rightN.rect.left, cy);
					spacingShown = true;
				}
			}
		}

		// ===== ONE-SIDED distribute: approaching a row from outside =====
		// Only inner neighbor exists -- snap the new gap to the row's own gap and
		// draw the chain: existing row gap + new gap (Canva-style).
		if (!distrX && ((leftN && !rightN) || (!leftN && rightN))) {
			const inner = (leftN || rightN) as GuideCache["others"][number];
			const toRight = !!leftN; // moving sits right of inner
			let outer: GuideCache["others"][number] | null = null;
			for (const o of cache.others) {
				if (o === inner) continue;
				const b = o.rect;
				if (b.bottom < mb.top - SNAP_THRESHOLD || b.top > mb.bottom + SNAP_THRESHOLD) continue;
				if (toRight) {
					if (b.right <= inner.rect.left + SNAP_THRESHOLD && b.right > inner.rect.left - NEIGHBOR_SEARCH) {
						if (!outer || b.right > outer.rect.right) outer = o;
					}
				} else if (b.left >= inner.rect.right - SNAP_THRESHOLD && b.left < inner.rect.right + NEIGHBOR_SEARCH) {
					if (!outer || b.left < outer.rect.left) outer = o;
				}
			}
			if (outer) {
				const refGap = toRight ? inner.rect.left - outer.rect.right : outer.rect.left - inner.rect.right;
				if (refGap >= -SNAP_THRESHOLD && refGap <= NEIGHBOR_SEARCH) {
					distrX = true;
					const targetLeft = toRight ? inner.rect.right + refGap : inner.rect.left - refGap - mb.width;
					const d = targetLeft - mb.left;
					if (Math.abs(d) <= DISTRIBUTE_THRESHOLD && d !== 0) {
						dx = d;
					}
					const gapMoving = toRight ? mb.left - inner.rect.right : inner.rect.left - mb.right;
					if (Math.abs(gapMoving - refGap) <= DISTRIBUTE_THRESHOLD) {
						if (toRight) {
							drawXGap(outer.rect.right, inner.rect.left, cy);
							drawXGap(inner.rect.right, mb.left + dx, cy);
						} else {
							drawXGap(mb.right + dx, inner.rect.left, cy);
							drawXGap(inner.rect.right, outer.rect.left, cy);
						}
						spacingShown = true;
					}
				}
			}
		}

		// Y axis distribute
		let topN: GuideCache["others"][number] | null = null;
		let bottomN: GuideCache["others"][number] | null = null;
		for (const o of cache.others) {
			const b = o.rect;
			if (b.right < mb.left - SNAP_THRESHOLD || b.left > mb.right + SNAP_THRESHOLD) continue;
			if (b.bottom <= mb.top + SNAP_THRESHOLD && b.bottom > mb.top - NEIGHBOR_SEARCH) {
				if (!topN || b.bottom > topN.rect.bottom) topN = o;
			}
			if (b.top >= mb.bottom - SNAP_THRESHOLD && b.top < mb.bottom + NEIGHBOR_SEARCH) {
				if (!bottomN || b.top < bottomN.rect.top) bottomN = o;
			}
		}
		let distrY = false;
		if (topN && bottomN) {
			const gapT = mb.top - topN.rect.bottom;
			const gapB = bottomN.rect.top - mb.bottom;
			if (gapT >= -SNAP_THRESHOLD && gapB >= -SNAP_THRESHOLD) {
				distrY = true;
				const targetTop = (bottomN.rect.top + topN.rect.bottom - mb.height) / 2;
				const d = targetTop - mb.top;
				if (Math.abs(d) <= DISTRIBUTE_THRESHOLD && d !== 0) {
					dy = d;
				}
				if (Math.abs(gapT - gapB) <= DISTRIBUTE_THRESHOLD) {
					drawYGap(topN.rect.bottom, bottomN.rect.top, cx);
					spacingShown = true;
				}
			}
		}

		// ===== ONE-SIDED distribute (Y): approaching a column from outside =====
		if (!distrY && ((topN && !bottomN) || (!topN && bottomN))) {
			const inner = (topN || bottomN) as GuideCache["others"][number];
			const toBelow = !!topN; // moving sits below inner
			let outer: GuideCache["others"][number] | null = null;
			for (const o of cache.others) {
				if (o === inner) continue;
				const b = o.rect;
				if (b.right < mb.left - SNAP_THRESHOLD || b.left > mb.right + SNAP_THRESHOLD) continue;
				if (toBelow) {
					if (b.bottom <= inner.rect.top + SNAP_THRESHOLD && b.bottom > inner.rect.top - NEIGHBOR_SEARCH) {
						if (!outer || b.bottom > outer.rect.bottom) outer = o;
					}
				} else if (b.top >= inner.rect.bottom - SNAP_THRESHOLD && b.top < inner.rect.bottom + NEIGHBOR_SEARCH) {
					if (!outer || b.top < outer.rect.top) outer = o;
				}
			}
			if (outer) {
				const refGap = toBelow ? inner.rect.top - outer.rect.bottom : outer.rect.top - inner.rect.bottom;
				if (refGap >= -SNAP_THRESHOLD && refGap <= NEIGHBOR_SEARCH) {
					distrY = true;
					const targetTop = toBelow ? inner.rect.bottom + refGap : inner.rect.top - refGap - mb.height;
					const d = targetTop - mb.top;
					if (Math.abs(d) <= DISTRIBUTE_THRESHOLD && d !== 0) {
						dy = d;
					}
					const gapMoving = toBelow ? mb.top - inner.rect.bottom : inner.rect.top - mb.bottom;
					if (Math.abs(gapMoving - refGap) <= DISTRIBUTE_THRESHOLD) {
						if (toBelow) {
							drawYGap(outer.rect.bottom, inner.rect.top, cx);
							drawYGap(inner.rect.bottom, mb.top + dy, cx);
						} else {
							drawYGap(mb.bottom + dy, inner.rect.top, cx);
							drawYGap(inner.rect.bottom, outer.rect.top, cx);
						}
						spacingShown = true;
					}
				}
			}
		}

		// ===== ALIGNMENT (only on axes without distribute) =====
		if (!distrX) {
			let bestDist = SNAP_THRESHOLD + 1;
			for (const x of [mb.left, cx, mb.right]) {
				for (const c of cache.v) {
					const d = Math.abs(c - x);
					if (d <= SNAP_THRESHOLD && d < bestDist) {
						bestDist = d;
						dx = c - x;
						showAlignV = c;
					}
				}
			}
		}
		if (!distrY) {
			let bestDist = SNAP_THRESHOLD + 1;
			for (const y of [mb.top, cy, mb.bottom]) {
				for (const c of cache.h) {
					const d = Math.abs(c - y);
					if (d <= SNAP_THRESHOLD && d < bestDist) {
						bestDist = d;
						dy = c - y;
						showAlignH = c;
					}
				}
			}
		}

		if (dx || dy) {
			target.set({ left: (target.left ?? 0) + dx, top: (target.top ?? 0) + dy });
			target.setCoords();
		}

		if (!spacingShown && showAlignV != null) {
			ensureAlign(true).set({ x1: showAlignV, y1: 0, x2: showAlignV, y2: canvas.getHeight(), visible: true });
		} else {
			alignV?.set({ visible: false });
		}
		if (!spacingShown && showAlignH != null) {
			ensureAlign(false).set({ x1: 0, y1: showAlignH, x2: canvas.getWidth(), y2: showAlignH, visible: true });
		} else {
			alignH?.set({ visible: false });
		}
		canvas.requestRenderAll();
	};


	const markDirty = () => {
		dirty = true;
	};
	const onUp = () => {
		clear();
	};

	canvas.on("object:moving", onMoving);
	canvas.on("object:modified", () => {
		dirty = true;
		clear();
	});
	canvas.on("mouse:up", onUp);
	canvas.on("object:added", markDirty);
	canvas.on("object:removed", markDirty);
	canvas.on("selection:created", markDirty);
	canvas.on("selection:cleared", markDirty);

	return {
		detach() {
			canvas.off("object:moving", onMoving);
			canvas.off("mouse:up", onUp);
			canvas.off("object:added", markDirty);
			canvas.off("object:removed", markDirty);
			canvas.off("selection:created", markDirty);
			canvas.off("selection:cleared", markDirty);
			clear();
		},
	};
}
