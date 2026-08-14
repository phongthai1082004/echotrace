"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";

type PreviewPage = { thumbnailUrl?: string | null };

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;

export function BookPreview({
  open,
  onClose,
  pages,
  title,
  ratio = 1188 / 840,
}: {
  open: boolean;
  onClose: () => void;
  pages: PreviewPage[];
  title?: string;
  ratio?: number;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [input, setInput] = useState("");

  const count = pages.length;
  const BW = 420;
  const BH = Math.round(BW * ratio);

  useEffect(() => {
    if (!open) return;
    setPage(0); setZoom(1); setInput("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setPage((p) => Math.min(count - 1, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, count]);

  const jump = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || count === 0) return;
    const p = Math.max(0, Math.min(count - 1, n - 1));
    setPage(p); setInput(String(p + 1));
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#161616] text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <p className="font-bold truncate">{title || t("customer.studio.preview")}</p>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
          <X size={18} />
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <div
          className="relative rounded-r-lg overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.55)]"
          style={{ width: BW, height: BH, transform: `scale(${zoom})`, transition: "transform 300ms ease" }}
        >
          <Leaf thumb={pages[page]?.thumbnailUrl ?? null} index={page} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-white/10 flex-wrap">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0}
          className="p-2.5 rounded-lg border border-white/15 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
          <ChevronLeft size={18} />
        </button>

        <span className="font-mono text-[10px] font-bold tracking-widest uppercase whitespace-nowrap text-white/70">
          {t("customer.preview.page")} {count > 0 ? page + 1 : 0} {t("customer.preview.of")} {count}
        </span>

        <button onClick={() => setPage((p) => Math.min(count - 1, p + 1))} disabled={page >= count - 1}
          className="p-2.5 rounded-lg border border-white/15 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
          <ChevronRight size={18} />
        </button>

        <div className="w-px h-6 bg-white/15 mx-1" />

        <div className="flex items-center rounded-lg border border-white/15 overflow-hidden">
          <button onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
            className="p-2 hover:bg-white/10 transition-colors cursor-pointer">
            <ZoomOut size={16} />
          </button>
          <span className="px-2.5 font-mono text-[10px] font-bold whitespace-nowrap border-x border-white/15">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
            className="p-2 hover:bg-white/10 transition-colors cursor-pointer">
            <ZoomIn size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={count}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && jump(input)}
            placeholder={String(page + 1)}
            className="w-16 px-2 py-2 rounded-lg bg-white/10 border border-white/15 font-mono text-[11px] font-bold text-center outline-none focus:border-white/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button onClick={() => jump(input)}
            className="px-3 py-2 rounded-lg bg-white text-black font-mono text-[10px] font-bold tracking-widest uppercase hover:bg-white/85 transition-colors cursor-pointer">
            {t("customer.preview.go")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Leaf({ thumb, index }: { thumb: string | null; index: number }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="w-full h-full object-cover" draggable={false} />
      ) : (
        <span className="font-mono text-xs font-bold text-[#999]">{index + 1}</span>
      )}
    </div>
  );
}