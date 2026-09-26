"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NeoSelect } from "@/components/neo-select";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import { useCanvasStore } from "../../hooks/useCanvasState";
import { FONTS, TEXT_COLOR_PRESETS, resolveFormat } from "../../types";
import * as fabric from "fabric";
import { parseFilterSliders } from "../../lib/filters";
import { toggleFrameBorder, setFrameBorderWidth } from "../../lib/frames";

const SLIDER_KEYS = ["sliderBrightness", "sliderContrast", "sliderSaturation", "sliderVibrance"] as const;
const defaultVals = { Brightness: 0, Contrast: 0, Saturation: 0, Vibrance: 0 };
const SLIDER_FILTER: Record<(typeof SLIDER_KEYS)[number], keyof typeof defaultVals> = {
  sliderBrightness: "Brightness",
  sliderContrast: "Contrast",
  sliderSaturation: "Saturation",
  sliderVibrance: "Vibrance",
};

const PRESET_COLORS = TEXT_COLOR_PRESETS;

export function StudioProperties() {
  const { t } = useTranslation();
  const canvas = useCanvasStore((s) => s.canvas);
  const bookMeta = useCanvasStore((s) => s.bookMeta);
  const selectionVersion = useCanvasStore((s) => s.selectionVersion);
  const incrementSelectionVersion = useCanvasStore((s) => s.incrementSelectionVersion);
  const storeSliderValues = useCanvasStore((s) => s.filterSliderValues);
  const setFilterSliderValues = useCanvasStore((s) => s.setFilterSliderValues);

  useEffect(() => {
    const c = useCanvasStore.getState().canvas;
    const selected = c?.getActiveObject();
    if (!selected || selected.type !== "image") {
      setFilterSliderValues({ ...defaultVals });
      return;
    }
    const img = selected as fabric.FabricImage;
    setFilterSliderValues(parseFilterSliders(img.filters || []));
  }, [selectionVersion]);

  const selected = canvas?.getActiveObject();

  const updateSlider = (key: string, val: number) => {
    const prop = SLIDER_FILTER[key as (typeof SLIDER_KEYS)[number]];
    if (!prop) return;
    const newVals = { ...storeSliderValues, [prop]: val };
    setFilterSliderValues(newVals);
    if (!selected || selected.type !== "image") return;
    const img = selected as fabric.FabricImage;
    const filters = [...(img.filters || [])];
    const filterMap: Record<string, any> = {
      Brightness: new fabric.filters.Brightness({ brightness: val / 100 }),
      Contrast: new fabric.filters.Contrast({ contrast: val / 100 }),
      Saturation: new fabric.filters.Saturation({ saturation: val / 100 }),
      Vibrance: new fabric.filters.Vibrance({ vibrance: val / 100 }),
    };
    const filter = filterMap[prop];
    if (filter) {
      const idx = filters.findIndex((f: any) => f.type === filter.type);
      if (idx >= 0) filters[idx] = filter;
      else filters.push(filter);
      img.filters = filters;
      img.applyFilters();
      canvas?.renderAll();
    }
  };

  const applyText = (patch: Record<string, unknown> | ((txt: fabric.IText) => Record<string, unknown>)) => {
    if (!selected || (selected.type !== "i-text" && selected.type !== "textbox")) return;
    const txt = selected as fabric.IText;
    txt.set(typeof patch === "function" ? patch(txt) : patch);
    canvas?.renderAll();
  };

  const applyFont = (fontFamily: string) => applyText({ fontFamily });
  const applyBold = () =>
    applyText((txt) => ({ fontWeight: txt.fontWeight === "bold" ? "normal" : "bold" }));
  const applyItalic = () =>
    applyText((txt) => ({ fontStyle: txt.fontStyle === "italic" ? "normal" : "italic" }));
  const applyUnderline = () => applyText((txt) => ({ underline: !txt.underline }));
  const applyColor = (color: string) => applyText({ fill: color });

  const toHex = (color: string): string => {
    if (color.startsWith("#"))
      return color.length === 4 ? "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3] : color;
    if (color.startsWith("rgb")) {
      const m = color.match(/\d+/g);
      if (m && m.length >= 3) {
        return "#" + [m[0], m[1], m[2]].map((x) => (+x).toString(16).padStart(2, "0")).join("");
      }
    }
    return "#000000";
  };

  const selectedType = selected?.type;
  const isImage = selectedType === "image";
  const isText = selectedType === "i-text" || selectedType === "textbox";
  const isFrame = (selected as any)?.customProperties?.layer === "frame";

  const currentColor = toHex(((selected as any)?.fill as string) || "#000000");
  const [hexInput, setHexInput] = useState(currentColor.replace("#", ""));
  const photoFrameId = isImage ? (selected as any)?.customProperties?.frameId : null;
  const photoFrame =
    photoFrameId &&
    canvas
      ?.getObjects()
      .find((o: any) => (o as any).customProperties?.layer === "frame" && (o as any)._selId === photoFrameId);

  useEffect(() => {
    setHexInput(currentColor.replace("#", ""));
  }, [currentColor, selectionVersion]);

  // ponytail: ô số xài state local + commit khi blur/Enter — bind thẳng vào
  // fabric thì xóa trắng về 0/NaN, gõ dở cũng bị render đè (không nhập được số).
  const [sizeInput, setSizeInput] = useState("24");
  useEffect(() => {
    setSizeInput(String(Math.round((selected as any)?.fontSize ?? 24)));
  }, [selectionVersion]);
  const commitSize = () => {
    const v = parseInt(sizeInput, 10);
    if (!Number.isFinite(v)) {
      setSizeInput(String(Math.round((selected as any)?.fontSize ?? 24)));
      return;
    }
    const clamped = Math.min(200, Math.max(8, v));
    applyText({ fontSize: clamped });
    setSizeInput(String(clamped));
  };

  const fmt = resolveFormat(bookMeta);

  return (
    <div className="w-56 shrink-0 bg-[#FFF7D6] overflow-y-auto border-l-[3px] border-[#222]">
      <div className="p-4 border-b-[3px] border-[#222]">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">
          {t("customer.studio.properties")}
        </p>
        {isImage ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">
                  {t("customer.studio.adjust")}
                </p>
                <button
                  onClick={() => {
                    setFilterSliderValues({ ...defaultVals });
                    if (selected && selected.type === "image") {
                      const img = selected as fabric.FabricImage;
                      img.filters = [];
                      img.applyFilters();
                      canvas?.renderAll();
                    }
                  }}
                  className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-[transform,box-shadow] bg-white"
                >
                  {t("customer.studio.reset")}
                </button>
              </div>
              {SLIDER_KEYS.map((key) => (
                <div key={key} className="mb-2">
                  <div className="flex justify-between mb-0.5">
                    <p className="font-mono text-[8px] font-bold text-[#999]">{t(`customer.studio.${key}`)}</p>
                    <p className="font-mono text-[8px] font-bold text-[#999]">
                      {storeSliderValues[SLIDER_FILTER[key]]}
                    </p>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={storeSliderValues[SLIDER_FILTER[key]]}
                    onChange={(e) => updateSlider(key, Number(e.target.value))}
                    className="w-full h-1.5 bg-[#e8e6e0] rounded-full border-[1.5px] border-[#222] appearance-none cursor-pointer accent-[#222]"
                  />
                </div>
              ))}
            </div>
            {photoFrame && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">
                    {t("customer.studio.itemFrame")}
                  </p>
                  <button
                    onClick={() => {
                      canvas?.setActiveObject(photoFrame);
                      canvas?.renderAll();
                    }}
                    className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-[transform,box-shadow] bg-white"
                  >
                    {t("customer.studio.selectFrame")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : isText ? (
          <div className="space-y-3">
            <div>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">
                {t("customer.studio.font")}
              </p>
              <NeoSelect
                value={(selected as any)?.fontFamily || ""}
                onChange={applyFont}
                placeholder={t("customer.studio.font")}
                className="w-full"
                options={FONTS.map((f) => ({ value: f.css, label: f.name }))}
              />
            </div>
            {selected && (
              <div>
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">
                  {t("customer.studio.size")}
                </p>
                <input
                  type="number"
                  min={8}
                  max={200}
                  value={sizeInput}
                  onChange={(e) => setSizeInput(e.target.value)}
                  onBlur={commitSize}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="w-full font-mono text-[10px] font-bold p-1.5 rounded-md border-2 border-[#222] bg-white shadow-none! focus:shadow-none! focus:translate-x-0! focus:translate-y-0!"
                />
              </div>
            )}
            <div>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">
                {t("customer.studio.style")}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={applyBold}
                  className={`flex-1 py-1.5 rounded-md border-2 border-[#222] font-bold text-[10px] transition-all ${(selected as any)?.fontWeight === "bold" ? "bg-[#222] text-white" : "bg-white hover:bg-[#e8e6e0]"}`}
                >
                  B
                </button>
                <button
                  onClick={applyItalic}
                  className={`flex-1 py-1.5 rounded-md border-2 border-[#222] font-bold text-[10px] italic transition-all ${(selected as any)?.fontStyle === "italic" ? "bg-[#222] text-white" : "bg-white hover:bg-[#e8e6e0]"}`}
                >
                  I
                </button>
                <button
                  onClick={applyUnderline}
                  className={`flex-1 py-1.5 rounded-md border-2 border-[#222] font-bold text-[10px] underline transition-all ${(selected as any)?.underline ? "bg-[#222] text-white" : "bg-white hover:bg-[#e8e6e0]"}`}
                >
                  U
                </button>
              </div>
            </div>
            <div>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">
                {t("customer.studio.align")}
              </p>
              <div className="flex gap-1">
                {(
                  [
                    { v: "left", Icon: AlignLeft },
                    { v: "center", Icon: AlignCenter },
                    { v: "right", Icon: AlignRight },
                    { v: "justify", Icon: AlignJustify },
                  ] as const
                ).map(({ v, Icon }) => (
                  <button
                    key={v}
                    onClick={() => applyText({ textAlign: v })}
                    aria-label={v}
                    className={`flex-1 py-1.5 rounded-md border-2 border-[#222] flex items-center justify-center transition-all ${((selected as any)?.textAlign ?? "left") === v ? "bg-[#222] text-white" : "bg-white hover:bg-[#e8e6e0]"}`}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">
                {t("customer.studio.color")}
              </p>
              <div className="grid grid-cols-5 gap-1 mb-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      applyColor(c);
                      setHexInput(c.replace("#", ""));
                    }}
                    className={`w-full aspect-square rounded-md border-2 transition-all ${currentColor.toUpperCase() === c.toUpperCase() ? "border-[#222] scale-110 shadow" : "border-[#ccc] hover:border-[#999]"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] font-bold text-[#999]">#</span>
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                    setHexInput(val);
                    if (val.length === 6) applyColor("#" + val);
                  }}
                  onBlur={() => {
                    if (/^[0-9a-fA-F]{6}$/.test(hexInput)) {
                      applyColor("#" + hexInput);
                    } else {
                      setHexInput(currentColor.replace("#", ""));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  maxLength={6}
                  placeholder="000000"
                  className="flex-1 font-mono text-[10px] font-bold p-1.5 rounded-md border-2 border-[#222] bg-white uppercase shadow-none! focus:shadow-none! focus:translate-x-0! focus:translate-y-0!"
                />
              </div>
            </div>
          </div>
        ) : isFrame ? (
          <div className="space-y-3">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">
              {t("customer.studio.itemFrame")}
            </p>
            <p className="font-mono text-[10px] font-bold text-[#999]">{t("customer.studio.resizeOrRotate")}</p>
            <button
              onClick={() => {
                if (selected && canvas) toggleFrameBorder(canvas, selected as fabric.FabricObject);
                incrementSelectionVersion();
              }}
              className={`w-full font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1.5 rounded-md border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-[transform,box-shadow] ${(selected as any)?.customProperties?.borderHidden ? "bg-[#222] text-white" : "bg-white"}`}
            >
              {(selected as any)?.customProperties?.borderHidden
                ? t("customer.studio.showFrame")
                : t("customer.studio.hideFrame")}
            </button>
            <div>
              <div className="flex justify-between mb-1">
                <p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#666]">
                  {t("customer.studio.frameWidth")}
                </p>
                <p className="font-mono text-[8px] font-bold text-[#999]">
                  {(selected as any)?.customProperties?.strokeWidth || 1}px
                </p>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={(selected as any)?.customProperties?.strokeWidth || 1}
                onChange={(e) => {
                  if (selected && canvas) setFrameBorderWidth(canvas, selected as fabric.FabricObject, Number(e.target.value));
                  incrementSelectionVersion();
                }}
                className="w-full h-1.5 bg-[#e8e6e0] rounded-full border-[1.5px] border-[#222] appearance-none cursor-pointer accent-[#222]"
              />
            </div>
          </div>
        ) : (
          <p className="font-mono text-[10px] font-bold text-[#999]">{t("customer.studio.selectElement")}</p>
        )}
      </div>
      <div className="p-4">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">
          {t("customer.studio.canvas")}
        </p>
        {[
          [t("customer.studio.format"), `${fmt.cm} cm`],
          [t("customer.studio.size"), `${fmt.width} px - ${fmt.height} px`],
          [t("customer.studio.pages"), String(useCanvasStore.getState().pages.length)],
        ].map(([k, v]) => (
          <div key={k} className="mb-2.5">
            <p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k}</p>
            <p className="font-mono text-[10px] font-bold text-[#222]">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
