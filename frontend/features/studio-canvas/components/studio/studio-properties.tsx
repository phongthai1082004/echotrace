"use client";

import { useState } from "react";
import { useCanvasStore } from "../../hooks/useCanvasState";
import { FORMATS, FONTS } from "../../types";
import * as fabric from "fabric";

const photoFilters = [
  { name: "Warm", gradient: "from-[#8B6914]/60 to-[#F5E6D3]/40" },
  { name: "Cool", gradient: "from-[#4A7C9B]/60 to-[#E8F0F8]/40" },
  { name: "B&W", gradient: "from-[#444]/60 to-[#ccc]/40" },
  { name: "Gold", gradient: "from-[#D4A574]/60 to-[#FFF7D6]/40" },
  { name: "Mute", gradient: "from-[#7A9B6A]/60 to-[#F0F5EA]/40" },
  { name: "Noir", gradient: "from-[#111]/60 to-[#eee]/40" },
];

export function StudioProperties() {
  const canvas = useCanvasStore((s) => s.canvas);
  const selectedElementId = useCanvasStore((s) => s.selectedElementId);
  const bookMeta = useCanvasStore((s) => s.bookMeta);
  const { pushUndo } = useCanvasStore();
  const [sliders, setSliders] = useState({ Brightness: 0, Contrast: 0, Saturation: 0, Sharpness: 0 });

  const selected = canvas?.getActiveObject();
  const selectedImgSrc = selected?.type === "image" ? (selected as fabric.FabricImage).getSrc() : null;

  const updateSlider = (key: string, val: number) => {
    setSliders((prev) => ({ ...prev, [key]: val }));
    if (!selected || selected.type !== "image") return;
    const img = selected as fabric.FabricImage;
    const filters = img.filters || [];
    const filterMap: Record<string, any> = {
      Brightness: new fabric.filters.Brightness({ brightness: val / 100 }),
      Contrast: new fabric.filters.Contrast({ contrast: val / 100 }),
      Saturation: new fabric.filters.Saturation({ saturation: val / 100 }),
    };
    const filter = filterMap[key];
    if (filter) {
      const idx = filters.findIndex((f: any) => f.type === filter.type);
      if (idx >= 0) filters[idx] = filter;
      else filters.push(filter);
      img.filters = filters;
      img.applyFilters();
      canvas?.renderAll();
    }
  };

  const applyFont = (fontFamily: string) => {
    if (!selected || selected.type !== "i-text") return;
    const txt = selected as fabric.IText;
    pushUndo();
    txt.set({ fontFamily });
    canvas?.renderAll();
  };

  const applyFilterPreset = (name: string) => {
    if (!selected || selected.type !== "image") return;
    const img = selected as fabric.FabricImage;
    pushUndo();
    img.filters = [];
    const filter = {
      Warm: new fabric.filters.ColorMatrix({ matrix: [1,0,0,0,0.15, 0,1,0,0,0.08, 0,0,1,0,0, 0,0,0,1,0] }),
      Cool: new fabric.filters.ColorMatrix({ matrix: [1,0,0,0,-0.08, 0,1,0,0,0, 0,0,1,0,0.12, 0,0,0,1,0] }),
      "B&W": new fabric.filters.Grayscale(),
      Gold: new fabric.filters.ColorMatrix({ matrix: [1,0,0,0,0.2, 0,1,0,0,0.1, 0,0,1,0,0, 0,0,0,1,0] }),
      Mute: new fabric.filters.ColorMatrix({ matrix: [1,0,0,0,0.05, 0,1,0,0,0.05, 0,0,1,0,0.05, 0,0,0,0.85,0] }),
      Noir: new fabric.filters.ColorMatrix({ matrix: [0.3,0.3,0.3,0,0, 0.3,0.3,0.3,0,0, 0.3,0.3,0.3,0,0, 0,0,0,1,0] }),
    }[name];
    if (filter) {
      img.filters = [filter];
      img.applyFilters();
      canvas?.renderAll();
    }
  };

  const selectedType = selected?.type;
  const isImage = selectedType === "image";
  const isText = selectedType === "i-text" || selectedType === "textbox";

  const fmt = FORMATS[bookMeta.format];

  return (
    <div className="w-56 shrink-0 bg-[#FFF7D6] overflow-y-auto border-l-[3px] border-[#222]">
      <div className="p-4 border-b-[3px] border-[#222]">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Properties</p>
        {isImage ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">Adjust</p>
                <button onClick={() => {
                  setSliders({ Brightness: 0, Contrast: 0, Saturation: 0, Sharpness: 0 });
                  if (selected && selected.type === "image") {
                    const img = selected as fabric.FabricImage;
                    pushUndo();
                    img.filters = [];
                    img.applyFilters();
                    canvas?.renderAll();
                  }
                }}
                  className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all bg-white">
                  Reset
                </button>
              </div>
              {["Brightness", "Contrast", "Saturation", "Sharpness"].map((key) => (
                <div key={key} className="mb-2">
                  <div className="flex justify-between mb-0.5">
                    <p className="font-mono text-[8px] font-bold text-[#999]">{key}</p>
                    <p className="font-mono text-[8px] font-bold text-[#999]">{(sliders as any)[key]}</p>
                  </div>
                  <input type="range" min={-100} max={100} value={(sliders as any)[key]}
                    onChange={(e) => updateSlider(key, Number(e.target.value))}
                    className="w-full h-1.5 bg-[#e8e6e0] rounded-full border-[1.5px] border-[#222] appearance-none cursor-pointer accent-[#222]" />
                </div>
              ))}
            </div>
            <div>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">Filters</p>
              <div className="grid grid-cols-3 gap-1.5">
                {photoFilters.map((f) => (
                  <button key={f.name} onClick={() => applyFilterPreset(f.name)}
                    className="flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-[0px_0px_0_#222] transition-all bg-[#FFF7D6]">
                    <div className="w-full h-7 rounded-[2px] border-[1.5px] border-[#222] overflow-hidden relative">
                      {selectedImgSrc && <img src={selectedImgSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                      <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient}`} />
                    </div>
                    <span className="font-mono text-[6px] font-bold tracking-widest uppercase text-[#666]">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : isText ? (
          <div className="space-y-3">
            <div>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">Font</p>
              <select value={(selected as any)?.fontFamily || ""} onChange={(e) => applyFont(e.target.value)}
                className="w-full font-mono text-[10px] font-bold p-1.5 rounded-md border-2 border-[#222] bg-white">
                {FONTS.map((f) => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </select>
            </div>
            {selected && (
              <div>
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">Size</p>
                <input type="number" value={Math.round((selected as any).fontSize || 24)} onChange={(e) => {
                  selected.set({ fontSize: Number(e.target.value) });
                  canvas?.renderAll();
                }}
                  className="w-full font-mono text-[10px] font-bold p-1.5 rounded-md border-2 border-[#222] bg-white" />
              </div>
            )}
          </div>
        ) : (
          <p className="font-mono text-[10px] font-bold text-[#999]">Select an element</p>
        )}
      </div>
      <div className="p-4">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Canvas</p>
        {[["FORMAT", fmt.label], ["SIZE", `${fmt.width} × ${fmt.height} px`], ["PAGES", String(useCanvasStore.getState().pages.length)]].map(([k, v]) => (
          <div key={k} className="mb-2.5"><p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k}</p><p className="font-mono text-[10px] font-bold text-[#222]">{v}</p></div>
        ))}
      </div>
    </div>
  );
}
