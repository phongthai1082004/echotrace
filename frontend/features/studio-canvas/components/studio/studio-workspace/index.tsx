"use client";

import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useDrop } from "react-dnd";
import { useCanvasStore } from "../../../hooks/useCanvasState";
import { useElementControls } from "../../../hooks/useElementControls";
import { useStudioKeyboard } from "../../../hooks/useStudioKeyboard";
import { useCanvasThumbnail } from "../../../hooks/useCanvasThumbnail";
import { ZOOM_LEVELS, resolveFormat } from "../../../types";
import { isFrameObject, styleFrame, enforceZLayers, canvasPointer, syncFrameBorders } from "../../../lib/fabric-core";
import {
  hitTestFrame,
  removeDragOverlays,
  addFrameDragOverlays,
  reviveDeep,
  reclipPhotos,
  reviveObject,
  applyInteractionLock,
} from "../../../lib/frames";
import {
  placeDroppedPhoto,
  movePhotoWithFrame,
  unlockPhotoInFrame,
  lockPhotoInFrame,
  addPhotoDimOverlays,
  resolveFrameForPhoto,
  findPhotoInFrame,
} from "../../../lib/photos";
import { isCoverPage } from "../../../lib/layout-engine";
import { parsePageJson } from "../../../lib/sparse-json";
import { attachSmartGuides } from "../../../lib/smart-guides";


import { PagesSlider } from "./pages-slider";
import { FiltersBar } from "../filters-bar";
import { ContextMenu } from "../context-menu";
import { StudioSelectionTooltip } from "../studio-selection-tooltip";
import { useToast } from "@/components/toast";

export function StudioWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const epochRef = useRef(0);
  const destroyedRef = useRef(false);
  const loadedPageRef = useRef<number>(-1);
  const loadedUndoVerRef = useRef<number>(-1);
  const loadedViewRef = useRef<string>("");
  const setCanvas = useCanvasStore((s) => s.setCanvas);
  const bookMeta = useCanvasStore((s) => s.bookMeta);
  const zoomIndex = useCanvasStore((s) => s.zoomIndex);
  const activePageIndex = useCanvasStore((s) => s.activePageIndex);
  const viewMode = useCanvasStore((s) => s.viewMode);
  const undoVersion = useCanvasStore((s) => s.undoVersion);
  const ctxMenu = useCanvasStore((s) => s.ctxMenu);
  const setCtxMenu = useCanvasStore((s) => s.setCtxMenu);
  // ponytail: showToast ổn định (useCallback) nên closure trong useDrop deps [] vẫn đúng.
  const { showToast } = useToast();

  useElementControls();
  useStudioKeyboard();
  useCanvasThumbnail();

  const [, dropRef] = useDrop(
    () => ({
      accept: ["PHOTO", "STICKER"],
      hover: (item: any, monitor) => {
        if (item.type !== "PHOTO" || useCanvasStore.getState().autoPlaced) return;
        const c = useCanvasStore.getState().canvas;
        if (!c) return;
        const off = monitor.getClientOffset();
        if (!off) return;
        const p = canvasPointer(c, off.x, off.y);
        if (hitTestFrame(c, p.x, p.y)) useCanvasStore.getState().setAutoPlaced(true);
      },
      drop: (item: any, monitor) => {
        if (item.type === "PHOTO") useCanvasStore.getState().setAutoPlaced(false);
        const c = useCanvasStore.getState().canvas;
        if (!c) return;
        const off = monitor.getClientOffset();
        if (!off) return;
        const p = canvasPointer(c, off.x, off.y);
        if (item.type === "PHOTO") {
          useCanvasStore.getState().setAutoPlaced(false);
          // ponytail: core dùng chung với tap mobile (placeDroppedPhoto) —
          // snapshot trang/view, guard nửa, thay-thế, ảnh rời đều nằm trong đó.
          void placeDroppedPhoto(c, p.x, p.y, item.url, hitTestFrame, () =>
            showToast("customer.studio.wrongHalf", "warning"),
          );
        } else if (item.type === "STICKER" && item.url) {
          useCanvasStore.getState().pushUndo();
          fabric.FabricImage.fromURL(item.url, { crossOrigin: "anonymous" }).then((img) => {
            // Calculate proper scale to fit sticker in 150x150 area while maintaining aspect ratio
            const maxSize = 150;
            const s = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1));
            // Position sticker at drop point with center origin
            img.set({
              left: p.x,
              top: p.y,
              originX: "center",
              originY: "center",
              scaleX: s,
              scaleY: s,
              customProperties: { z: Date.now(), layer: "element", stickerName: item.name || "Sticker" },
            } as any);
            (img as any)._selId = `sticker-${Date.now()}`;
            c.add(img);
            c.setActiveObject(img);
            c.renderAll();
            enforceZLayers(c);
          });
        }
      },
    }),
    [],
  );

  const fmt = resolveFormat(bookMeta);
  const pageW = fmt.width;
  const ch = fmt.height;

  useEffect(() => {
    const s = useCanvasStore.getState();
    if (isCoverPage(s.activePageIndex, s.pages.length) && s.viewMode !== "spread") s.setViewMode("spread");
  }, [activePageIndex]);

  const isCover = useCanvasStore((s) => isCoverPage(s.activePageIndex, s.pages.length));
  const effectiveView = isCover ? "spread" : viewMode;
  const cw = isCover ? pageW : pageW * 2;

  const loadPageNow = (c: fabric.Canvas) => {
    const s = useCanvasStore.getState();
    const { pages, activePageIndex: idx } = s;
    const n = pages.length;
    const rightIdx = Math.min(idx + 1, n - 1);

    const prev = (c as any)._pageIdx;
    if (
      loadedPageRef.current === idx &&
      prev === idx &&
      loadedUndoVerRef.current === undoVersion &&
      loadedViewRef.current === effectiveView
    ) {
      applyInteractionLock(c, pageW, isCover, effectiveView, true);
      if (!isCover) {
        c.renderAll();
      }
      return;
    }

    ++epochRef.current;
    (c as any)._pageIdx = idx;
    loadedPageRef.current = idx;
    loadedUndoVerRef.current = undoVersion;
    loadedViewRef.current = effectiveView;
    c.clear();
    c.backgroundColor = "#fff";
    if (isCover) {
      const pg = useCanvasStore.getState().pages[idx];
      const coverJson = pg?.canvasJson;
      if (coverJson) {
        // ponytail: single parse+hydrate — loadFromJSON tolerates the refilled defaults.
        const coverParsed = parsePageJson(coverJson);
        try {
          void c
            .loadFromJSON(coverParsed ?? {}, reviveObject)
            .then(() => {
				if (destroyedRef.current) return;
              c.backgroundColor = "#fff";
              try {
                reviveDeep(coverParsed?.objects || [], c.getObjects());
              } catch {
                /* keep top-level revive only */
              }
              reclipPhotos(c);
              c.renderAll();
            })
            .catch(() => {
              if (!destroyedRef.current) c.renderAll();
            });
        } catch {
          if (!destroyedRef.current) c.renderAll();
        }
      }
      if (!destroyedRef.current) {
        c.selection = true;
        c.renderAll();
      }
    } else {
      const latestPages = useCanvasStore.getState().pages;
      const merged: any = { version: "7.4", background: "#fff", objects: [] };
      const leftPg = latestPages[idx];
      if (leftPg?.canvasJson) {
        parsePageJson(leftPg.canvasJson)?.objects?.forEach((o: any) => merged.objects.push(o));
      }
      const rightPg = latestPages[rightIdx];
      if (rightPg?.canvasJson && rightPg !== leftPg) {
        const rj = parsePageJson(rightPg.canvasJson);
        rj?.objects?.forEach((o: any) => {
          o.left = (o.left || 0) + pageW;
          merged.objects.push(o);
        });
      }
      if (!destroyedRef.current) {
        try {
          void c
            .loadFromJSON(merged, reviveObject)
            .then(() => {
				if (destroyedRef.current) return;
              c.backgroundColor = "#fff";
              reviveDeep(merged.objects || [], c.getObjects());
              // Remove old spine line if exists
              c.getObjects()
                .filter((o: any) => (o as any)._spine)
                .forEach((o) => c.remove(o));
              c.add(
                new fabric.Line([pageW, 0, pageW, ch], {
                  stroke: "#222",
                  strokeWidth: 1,
                  strokeDashArray: [6, 4],
                  selectable: false,
                  evented: false,
                  excludeFromExport: true,
                }).set({ _spine: true } as any),
              );
              c.selection = true;
              applyInteractionLock(c, pageW, isCover, effectiveView);
              reclipPhotos(c);
              c.renderAll();
            })
            .catch(() => {
              if (!destroyedRef.current) c.renderAll();
            });
        } catch {
          if (!destroyedRef.current) c.renderAll();
        }
      }
    }
  };

	// W-opt: canvas-create effect AND page-change effect both call loadPage in the same
	// commit on cover<->inner switches -- the double call bumped the load epoch and skipped
	// the render, leaving the previous page painted until a click. Dedupe: one load per
	// frame, latest canvas wins.
	const pendingLoad: { canvas: fabric.Canvas | null; raf: number | null } = { canvas: null, raf: null };
	const loadPage = (c: fabric.Canvas) => {
		pendingLoad.canvas = c;
		if (pendingLoad.raf != null) return;
		pendingLoad.raf = requestAnimationFrame(() => {
			pendingLoad.raf = null;
			const cc = pendingLoad.canvas;
			pendingLoad.canvas = null;
			if (cc) loadPageNow(cc);
		});
	};

  // create canvas once, resize on width change
  useEffect(() => {
    if (!canvasRef.current) return;
    destroyedRef.current = false;
    const epoch = ++epochRef.current;
    const c = new fabric.Canvas(canvasRef.current, {
      width: cw,
      height: ch,
      preserveObjectStacking: true,
      selection: true,
      fireRightClick: true,
      stopContextMenu: true,
      autoRender: true,
    });
    fabricRef.current = c;
    (fabric.FabricObject.prototype as any).snapAngle = 15;
    (fabric.FabricObject.prototype as any).snapThreshold = 6;
    function applyStyle(o: any) {
      o.set({
        cornerStyle: "circle",
        cornerColor: "#7c3aed",
        cornerStrokeColor: "#7c3aed",
        transparentCorners: false,
        cornerSize: 12,
        borderColor: "#7c3aed",
        borderScaleFactor: 3,
        padding: 4,
      });
      if (o.controls) {
        if (o.controls.tl) o.controls.tl.cursorStyle = "nwse-resize";
        if (o.controls.br) o.controls.br.cursorStyle = "nwse-resize";
        if (o.controls.tr) o.controls.tr.cursorStyle = "nesw-resize";
        if (o.controls.bl) o.controls.bl.cursorStyle = "nesw-resize";
      }
      decorateRotateControl(o);
      if ((o as any).customProperties?.layer === "frame") styleFrame(o);
    }
    // ponytail: white glyph inside the mtr circle — same render pass as the circle, always centered.
    function decorateRotateControl(o: any) {
      const mtr = o.controls?.mtr;
      if (!mtr || mtr._glyph) return;
      mtr._glyph = true;
      const base = mtr.render.bind(mtr);
      mtr.render = (ctx: CanvasRenderingContext2D, left: number, top: number, style: any, obj: any) => {
        base(ctx, left, top, style, obj);
        const size = mtr.sizeX || obj.cornerSize || 12;
        const rr = size * 0.24;
        const lw = Math.max(1.2, size * 0.11);
        ctx.save();
        ctx.translate(left, top);
        ctx.strokeStyle = "#fff";
        ctx.fillStyle = "#fff";
        ctx.lineWidth = lw;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const a1 = Math.PI * 1.45;
        ctx.beginPath();
        ctx.arc(0, 0, rr, -0.5, a1);
        ctx.stroke();
        const ex = Math.cos(a1) * rr;
        const ey = Math.sin(a1) * rr;
        const tx = -Math.sin(a1);
        const ty = Math.cos(a1);
        const h = lw * 2.4;
        const w = lw * 1.5;
        ctx.beginPath();
        ctx.moveTo(ex + tx * h, ey + ty * h);
        ctx.lineTo(ex - ty * w, ey + tx * w);
        ctx.lineTo(ex + ty * w, ey - tx * w);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
    }
    c.getObjects().forEach(applyStyle);
    let dragUndoPushed = false;
    c.on("object:moving", () => {
      if (!dragUndoPushed) {
        dragUndoPushed = true;
        useCanvasStore.getState().pushUndo();
      }
    });
    c.on("object:scaling", () => {
      if (!dragUndoPushed) {
        dragUndoPushed = true;
        useCanvasStore.getState().pushUndo();
      }
    });
    c.on("object:rotating", () => {
      if (!dragUndoPushed) {
        dragUndoPushed = true;
        useCanvasStore.getState().pushUndo();
      }
    });
    c.on("object:modified", () => {
      const a = c.getActiveObject();
      if (a) a.setCoords();
      enforceZLayers(c);
      dragUndoPushed = false;
    });
    const syncF = (e: any) => {
      const o = e.target;
      o.setCoords();
      if (!isFrameObject(o)) return;
      const p = findPhotoInFrame(c, o);
      if (p) movePhotoWithFrame(o, p);
    };
    c.on("object:moving", syncF);
    c.on("object:scaling", (e: any) => {
      const o = e.target;
      o.setCoords();
      c.requestRenderAll();
      if ((o as any).hasControls && (o as any).customProperties?.layer === "photo") addPhotoDimOverlays(c, o as any);
      if (isFrameObject(o)) {
        const p = findPhotoInFrame(c, o);
        if (p) movePhotoWithFrame(o, p);
      }
    });
    c.on("object:rotating", syncF);
    c.on("selection:cleared", () => {
      setTimeout(() => {
        if (c.getActiveObject()) return;
        c.getObjects()
          .filter((o: any) => o.customProperties?.layer === "photo" && (o as any).hasControls)
          .forEach((p: any) => lockPhotoInFrame(c, p as any));
      }, 0);
    });
    c.on("selection:created", (e: any) => {
      const selected = e.selected || [];
      if (!selected.length) return;
      const unlocked = c
        .getObjects()
        .filter((o: any) => o.customProperties?.layer === "photo" && (o as any).hasControls) as fabric.FabricImage[];
      if (!unlocked.length) return;
      unlocked.forEach((photo: any) => {
        const frame = resolveFrameForPhoto(c, photo);
        if (frame && selected.includes(frame)) return;
        if (selected.includes(photo)) return;
        lockPhotoInFrame(c, photo);
      });
    });
    c.on("selection:updated", (e: any) => {
      const selected = e.selected || [];
      if (!selected.length) return;
      const unlocked = c
        .getObjects()
        .filter((o: any) => o.customProperties?.layer === "photo" && (o as any).hasControls) as fabric.FabricImage[];
      if (!unlocked.length) return;
      unlocked.forEach((photo: any) => {
        const frame = resolveFrameForPhoto(c, photo);
        if (frame && selected.includes(frame)) return;
        if (selected.includes(photo)) return;
        lockPhotoInFrame(c, photo);
      });
    });
    c.on("object:added", (e: any) => {
      if (e.target) applyStyle(e.target);
      syncFrameBorders(c);
      enforceZLayers(c);
      useCanvasStore.getState().incrementLayerVersion();
    });
    // ponytail: ActiveSelection builds its own controls — decorate on select.
    const decorateActive = () => {
      const a = c.getActiveObject() as any;
      if (a) decorateRotateControl(a);
    };
    c.on("selection:created", decorateActive);
    c.on("selection:updated", decorateActive);
    c.on("object:removed", () => {
      syncFrameBorders(c);
      useCanvasStore.getState().incrementLayerVersion();
    });
    c.on("text:changed", () => useCanvasStore.getState().incrementLayerVersion());
    c.on("mouse:dblclick", () => {
      const a = c.getActiveObject();
      if (!a || !isFrameObject(a)) return;
      const fid = (a as any)._selId;
      let p: any = c.getObjects().find((o: any) => o.customProperties?.frameId === fid);
      if (!p) {
        p = c
          .getObjects()
          .find(
            (o: any) =>
              o.customProperties?.layer === "photo" && a.containsPoint(new fabric.Point(o.left || 0, o.top || 0)),
          );
      }
      if (p) {
        unlockPhotoInFrame(c, p as any);
        c.setActiveObject(p as any);
        c.renderAll();
      }
    });
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    canvasRef.current!.addEventListener("contextmenu", onContextMenu);
    c.on("mouse:down", (ev: any) => {
      const native = ev.e as MouseEvent;
      const setMenu = useCanvasStore.getState().setCtxMenu;
      if (native.button === 2) {
        const sel = c.getActiveObjects();
        if (sel.length) {
          setMenu({ x: native.clientX, y: native.clientY, objects: sel });
        }
      } else {
        setMenu(null);
      }
    });

    c.backgroundColor = "#fff";
    c.renderAll();
    setCanvas(c);
    // ponytail: without this call the import above is dead -- no object:moving
    // handler, no snapping. Detach on cleanup to avoid duplicate handlers.
    const smartGuides = attachSmartGuides(c);
    loadPage(c);
    return () => {
      smartGuides.detach();
      destroyedRef.current = true;
      loadedPageRef.current = -1;
      canvasRef.current?.removeEventListener("contextmenu", onContextMenu);
      c.dispose();
      fabricRef.current = null;
      if (useCanvasStore.getState().canvas === c) setCanvas(null);
      if (epochRef.current === epoch) epochRef.current++;
    };
  }, [cw, bookMeta.format]);
  useEffect(() => {
    const c = fabricRef.current || useCanvasStore.getState().canvas;
    if (c) {
      c.discardActiveObject();
      loadPage(c);
    }
  }, [activePageIndex, viewMode, undoVersion]);

  const isDraggingPhoto = useCanvasStore((s) => s.isDraggingPhoto);
  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    if (isDraggingPhoto) {
      addFrameDragOverlays(c);
      // remove overlays on the non-interactive side
      if (effectiveView === "left") {
        c.getObjects()
          .filter((o: any) => o._dragOverlay && (o.left || 0) >= pageW)
          .forEach((o) => c.remove(o));
      } else if (effectiveView === "right") {
        c.getObjects()
          .filter((o: any) => o._dragOverlay && (o.left || 0) < pageW)
          .forEach((o) => c.remove(o));
      }
      c.renderAll();
    } else {
      removeDragOverlays(c);
    }
  }, [isDraggingPhoto]);

  // ponytail: mobile tap-to-place — tap ảnh để "cầm" (photos-panel arm),
  // tap canvas để đặt vào khung (fill/thay thế) hoặc ảnh rời. Không cần TouchBackend.
  const storeCanvas = useCanvasStore((s) => s.canvas);
  useEffect(() => {
    if (!storeCanvas) return;
    const handler = (opt: any) => {
      const st = useCanvasStore.getState();
      const url = st.armedPhotoUrl;
      if (!url) return;
      const e = opt?.e as MouseEvent | TouchEvent | undefined;
      const cx =
        e instanceof MouseEvent ? e.clientX : (e as any)?.changedTouches?.[0]?.clientX;
      const cy =
        e instanceof MouseEvent ? e.clientY : (e as any)?.changedTouches?.[0]?.clientY;
      if (cx === undefined || cy === undefined) return;
      st.setArmedPhotoUrl(null);
      const p = canvasPointer(storeCanvas, cx, cy);
      void placeDroppedPhoto(storeCanvas, p.x, p.y, url, hitTestFrame, () =>
        showToast("customer.studio.wrongHalf", "warning"),
      );
    };
    storeCanvas.on("mouse:down", handler);
    return () => {
      storeCanvas.off("mouse:down", handler);
    };
  }, [storeCanvas]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const s = useCanvasStore.getState();
      const dir = e.deltaY < 0 ? 1 : -1;
      const idx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, s.zoomIndex + dir));
      if (idx === s.zoomIndex) return;
      const os = ZOOM_LEVELS[s.zoomIndex],
        ns = ZOOM_LEVELS[idx];
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left,
        my = e.clientY - r.top;
      el.scrollLeft = mx * (1 - ns / os) + (el.scrollLeft * ns) / os;
      el.scrollTop = my * (1 - ns / os) + (el.scrollTop * ns) / os;
      s.setZoomIndex(idx);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [bookMeta.format]);



  const zoom = ZOOM_LEVELS[zoomIndex];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0" ref={dropRef as any}>
      <div
        ref={viewportRef}
        className="flex-1 overflow-auto bg-[#e8e6e0]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div
          style={{
            minWidth: "100%",
            minHeight: "100%",
            padding: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "fit-content",
          }}
        >
          <div style={{ width: cw * zoom, height: ch * zoom, position: "relative", flexShrink: 0 }}>
            <StudioSelectionTooltip />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: cw,
                height: ch,
                transform: `scale(${zoom})`,
                transformOrigin: "0 0",
                borderStyle: "solid",
                borderColor: "#222",
                borderWidth: "3px 3px 6px 6px",
                boxShadow: "6px 6px 0 #222",
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <canvas ref={canvasRef} />
              {!isCover && effectiveView !== "spread" && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: effectiveView === "left" ? "50%" : 0,
                    width: "50%",
                    height: "100%",
                    background: "rgba(128,128,128,0.18)",
                    // ponytail: chỉ phủ mờ thôi — không có dòng này là nó nuốt hết
                    // chuột nửa không focus, object nhìn như "in vào trang".
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <FiltersBar />
      <div className="hidden lg:contents">
        <PagesSlider />
      </div>
      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} objects={ctxMenu.objects} onClose={() => setCtxMenu(null)} />
      )}
    </div>
  );
}
