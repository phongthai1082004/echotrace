export type CanvasElement = {
  id: string;
  type: "text" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize?: number;
  fontFamily?: string;
  zIndex: number;
  imageUrl?: string;
};

export const FONTS: { name: string; css: string; preview: string }[] = [
  { name: "Playfair Display", css: "'Playfair Display', serif",     preview: "Playfair" },
  { name: "Cormorant Garamond", css: "'Cormorant Garamond', serif", preview: "Cormorant" },
  { name: "Space Grotesk",     css: "'Space Grotesk', sans-serif",  preview: "Grotesk" },
  { name: "Inter",             css: "'Inter', sans-serif",           preview: "Inter" },
  { name: "JetBrains Mono",   css: "'JetBrains Mono', monospace",  preview: "Mono" },
  { name: "DM Mono",           css: "'DM Mono', monospace",          preview: "DM Mono" },
];

export function fontCss(name: string | undefined): string {
  return FONTS.find((f) => f.name === name)?.css ?? "'Playfair Display', serif";
}

export const ZOOM_LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 1.0, 1.25, 1.5, 2.0];

export const LAYOUT_TEMPLATES = [
  { id: "t1", label: "Full Bleed", desc: "Single dramatic image" },
  { id: "t2", label: "Split", desc: "50/50 image & text" },
  { id: "t3", label: "Scrapbook", desc: "Offset photo collage" },
  { id: "t4", label: "Editorial", desc: "Headline + caption" },
  { id: "t5", label: "Map Log", desc: "Coordinates & route" },
  { id: "t6", label: "Minimal", desc: "Text only, wide margin" },
];

export const STOCK_PHOTOS = [
  { id: "sp1", url: "https://images.unsplash.com/photo-1775830150436-1cbe3d5ad3c6?w=300&h=400&fit=crop&auto=format", label: "Ha Long Bay" },
  { id: "sp2", url: "https://images.unsplash.com/photo-1757679789909-29f58dfd065b?w=300&h=200&fit=crop&auto=format", label: "Connemara" },
  { id: "sp3", url: "https://images.unsplash.com/photo-1533093814449-96af23c8f43f?w=300&h=400&fit=crop&auto=format", label: "Harvest Field" },
  { id: "sp4", url: "https://images.unsplash.com/photo-1765660996991-31f345c40247?w=300&h=400&fit=crop&auto=format", label: "High Atlas" },
  { id: "sp5", url: "https://images.unsplash.com/photo-1762810629910-5ad48ad9b181?w=300&h=400&fit=crop&auto=format", label: "Coastal Rocks" },
];

export const initialElements: CanvasElement[] = [
  {
    id: "el-1",
    type: "text",
    x: 60,
    y: 80,
    width: 340,
    height: 120,
    content: "West Africa Circuit",
    fontSize: 48,
    fontFamily: "Playfair Display",
    zIndex: 1,
  },
  {
    id: "el-2",
    type: "image",
    x: 420,
    y: 40,
    width: 360,
    height: 480,
    content: "",
    zIndex: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1533093814449-96af23c8f43f?w=720&h=960&fit=crop&auto=format",
  },
  {
    id: "el-3",
    type: "text",
    x: 60,
    y: 220,
    width: 340,
    height: 60,
    content: "6.5235° N, 3.3823° E  —  2024-07-01T09:14:00+01:00",
    fontSize: 11,
    fontFamily: "JetBrains Mono",
    zIndex: 3,
  },
];
