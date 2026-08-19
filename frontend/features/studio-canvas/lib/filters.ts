import * as fabric from "fabric";

export type Preset = {
  name: string;
  cssFilter: string;
  gradient: string;
  apply: () => fabric.filters.BaseFilter<any, any, any>[];
};

export const FILTER_PRESETS: Preset[] = [
  { name: "Original", cssFilter: "", gradient: "from-[#FFF]/60 to-[#FFF]/40", apply: () => [] },
  {
    name: "Warm Vintage",
    cssFilter: "sepia(0.3) saturate(1.2) brightness(1.05)",
    gradient: "from-[#8B6914]/60 to-[#F5E6D3]/40",
    apply: () => [
      new fabric.filters.ColorMatrix({ matrix: [1, 0, 0, 0, 0.15, 0, 1, 0, 0, 0.08, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0] }),
    ],
  },
  {
    name: "Cool Breeze",
    cssFilter: "hue-rotate(10deg) saturate(0.9)",
    gradient: "from-[#4A7C9B]/60 to-[#E8F0F8]/40",
    apply: () => [
      new fabric.filters.ColorMatrix({ matrix: [1, 0, 0, 0, -0.08, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0.12, 0, 0, 0, 1, 0] }),
    ],
  },
  {
    name: "Monochrome",
    cssFilter: "grayscale(1)",
    gradient: "from-[#444]/60 to-[#ccc]/40",
    apply: () => [new fabric.filters.Grayscale()],
  },
  {
    name: "Golden Hour",
    cssFilter: "sepia(0.5) saturate(1.3) brightness(1.1)",
    gradient: "from-[#D4A574]/60 to-[#FFF7D6]/40",
    apply: () => [
      new fabric.filters.ColorMatrix({ matrix: [1, 0, 0, 0, 0.2, 0, 1, 0, 0, 0.1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0] }),
    ],
  },
  {
    name: "Matte Film",
    cssFilter: "saturate(0.7) brightness(1.1) contrast(0.9)",
    gradient: "from-[#7A9B6A]/60 to-[#F0F5EA]/40",
    apply: () => [
      new fabric.filters.ColorMatrix({
        matrix: [1, 0, 0, 0, 0.05, 0, 1, 0, 0, 0.05, 0, 0, 1, 0, 0.05, 0, 0, 0, 0.85, 0],
      }),
    ],
  },
  {
    name: "Noir",
    cssFilter: "grayscale(1) contrast(1.5) brightness(0.9)",
    gradient: "from-[#111]/60 to-[#eee]/40",
    apply: () => [
      new fabric.filters.ColorMatrix({
        matrix: [0.3, 0.3, 0.3, 0, 0, 0.3, 0.3, 0.3, 0, 0, 0.3, 0.3, 0.3, 0, 0, 0, 0, 0, 1, 0],
      }),
    ],
  },
  {
    name: "Sepia",
    cssFilter: "sepia(1)",
    gradient: "from-[#704214]/60 to-[#F5DEB3]/40",
    apply: () => [
      new fabric.filters.ColorMatrix({
        matrix: [0.393, 0.769, 0.189, 0, 0, 0.349, 0.686, 0.168, 0, 0, 0.272, 0.534, 0.131, 0, 0, 0, 0, 0, 1, 0],
      }),
    ],
  },
  {
    name: "Invert",
    cssFilter: "invert(1)",
    gradient: "from-[#333]/60 to-[#ddd]/40",
    apply: () => [new fabric.filters.Invert()],
  },
  {
    name: "Lomo",
    cssFilter: "saturate(1.3) contrast(1.1) sepia(0.2)",
    gradient: "from-[#B8860B]/60 to-[#FFD700]/40",
    apply: () => [
      new fabric.filters.ColorMatrix({
        matrix: [1.2, 0.1, 0, 0, -0.1, 0, 1.1, 0.1, 0, 0, 0, 0, 0.9, 0.15, 0, 0, 0, 0, 1, 0],
      }),
    ],
  },
  {
    name: "Cross Process",
    cssFilter: "hue-rotate(60deg) saturate(1.2)",
    gradient: "from-[#006400]/60 to-[#FFD700]/40",
    apply: () => [
      new fabric.filters.ColorMatrix({
        matrix: [1.1, 0.1, 0, 0, 0, 0, 1.0, 0.15, 0, 0, 0.1, 0, 0.9, 0.1, 0, 0, 0, 0, 1, 0],
      }),
    ],
  },
  {
    name: "Polaroid",
    cssFilter: "sepia(0.2) brightness(1.05) saturate(1.1)",
    gradient: "from-[#CD853F]/60 to-[#FFFACD]/40",
    apply: () => [
      new fabric.filters.ColorMatrix({
        matrix: [1.1, 0.1, 0, 0, 0.05, 0, 1.05, 0, 0, 0.03, 0, 0, 0.95, 0.05, 0, 0, 0, 0, 1, 0],
      }),
    ],
  },
  {
    name: "Cinematic",
    cssFilter: "hue-rotate(330deg) saturate(0.8) sepia(0.2)",
    gradient: "from-[#1a3a4a]/60 to-[#d4956a]/40",
    apply: () => [
      new fabric.filters.ColorMatrix({
        matrix: [0.9, 0.1, 0, 0, 0, 0, 1.0, 0.05, 0, 0, 0.05, 0.1, 1.1, 0.05, 0, 0, 0, 0, 1, 0],
      }),
    ],
  },
  {
    name: "Dramatic",
    cssFilter: "contrast(1.4) brightness(0.9) saturate(0.8)",
    gradient: "from-[#222]/60 to-[#ccc]/40",
    apply: () => [
      new fabric.filters.Contrast({ contrast: 0.4 }),
      new fabric.filters.ColorMatrix({ matrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0.9, 0] }),
    ],
  },
  {
    name: "Soft Focus",
    cssFilter: "blur(1px) brightness(1.05)",
    gradient: "from-[#B0C4DE]/60 to-[#F5F5F5]/40",
    apply: () => [new fabric.filters.Blur({ blur: 0.04 }), new fabric.filters.Brightness({ brightness: 0.05 })],
  },
  {
    name: "High Key",
    cssFilter: "brightness(1.15) contrast(0.85)",
    gradient: "from-[#F0F0F0]/60 to-[#FFFFFF]/40",
    apply: () => [
      new fabric.filters.Brightness({ brightness: 0.15 }),
      new fabric.filters.Contrast({ contrast: -0.15 }),
    ],
  },
  {
    name: "Low Key",
    cssFilter: "brightness(0.85) contrast(1.25)",
    gradient: "from-[#111]/60 to-[#444]/40",
    apply: () => [
      new fabric.filters.Brightness({ brightness: -0.15 }),
      new fabric.filters.Contrast({ contrast: 0.25 }),
    ],
  },
  {
    name: "Desaturate",
    cssFilter: "saturate(0.3)",
    gradient: "from-[#888]/60 to-[#ddd]/40",
    apply: () => [new fabric.filters.Saturation({ saturation: -0.7 })],
  },
  {
    name: "Vibrance",
    cssFilter: "saturate(1.6) contrast(1.05)",
    gradient: "from-[#FF6347]/60 to-[#FFD700]/40",
    apply: () => [new fabric.filters.Vibrance({ vibrance: 0.8 })],
  },
  {
    name: "Faded",
    cssFilter: "saturate(0.6) brightness(1.1) opacity(0.85)",
    gradient: "from-[#A0A0A0]/60 to-[#E8E8E8]/40",
    apply: () => [
      new fabric.filters.ColorMatrix({
        matrix: [0.9, 0.1, 0.1, 0, 0.08, 0.1, 0.9, 0.1, 0, 0.08, 0.1, 0.1, 0.9, 0, 0.08, 0, 0, 0, 0.88, 0],
      }),
    ],
  },
];

export function parseFilterSliders(filters: fabric.filters.BaseFilter<any, any, any>[]) {
  const vals = { Brightness: 0, Contrast: 0, Saturation: 0, Vibrance: 0 };
  (filters as any[]).forEach((f) => {
    if (f.type === "Brightness") vals.Brightness = Math.round(f.brightness * 100);
    if (f.type === "Contrast") vals.Contrast = Math.round(f.contrast * 100);
    if (f.type === "Saturation") vals.Saturation = Math.round(f.saturation * 100);
    if (f.type === "Vibrance") vals.Vibrance = Math.round(f.vibrance * 100);
  });
  return vals;
}
