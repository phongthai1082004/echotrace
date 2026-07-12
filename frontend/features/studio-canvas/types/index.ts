export type FormatKey = 'A4_PORTRAIT' | 'SQUARE' | 'LANDSCAPE';

export const FORMATS: Record<FormatKey, { width: number; height: number; label: string }> = {
  A4_PORTRAIT: { width: 840, height: 1188, label: 'A4' },
  SQUARE:      { width: 840, height: 840,  label: '□' },
  LANDSCAPE:   { width: 1188, height: 840, label: '⊞' },
};

export type LayoutCell = { x: number; y: number; w: number; h: number };

export type Layout = {
  id: string;
  label: string;
  desc: string;
  formats: FormatKey[];
  cells: LayoutCell[];
};

export const LAYOUTS: Layout[] = [
  { id: "full-bleed",  label: "Full Page", desc: "Single full-bleed photo",  formats: ["A4_PORTRAIT" as FormatKey,"SQUARE" as FormatKey,"LANDSCAPE" as FormatKey], cells: [[0,0,1,1]] },
  { id: "split",       label: "Split",     desc: "50/50 image & text",       formats: ["A4_PORTRAIT" as FormatKey,"SQUARE" as FormatKey,"LANDSCAPE" as FormatKey], cells: [[0,0,0.5,1],[0.5,0,0.5,1]] },
  { id: "montage",     label: "Montage",   desc: "Three staggered photos",   formats: ["A4_PORTRAIT" as FormatKey,"LANDSCAPE" as FormatKey], cells: [[0,0,0.6,0.55],[0.6,0,0.4,0.4],[0.5,0.55,0.5,0.45]] },
  { id: "canvas",      label: "Canvas",    desc: "Text column + image",      formats: ["A4_PORTRAIT" as FormatKey,"SQUARE" as FormatKey,"LANDSCAPE" as FormatKey], cells: [[0,0,0.35,1],[0.35,0,0.65,1]] },
  { id: "grid-2x2",    label: "Grid 2×2",  desc: "Four equal photos",       formats: ["SQUARE" as FormatKey], cells: [[0,0,0.5,0.5],[0.5,0,0.5,0.5],[0,0.5,0.5,0.5],[0.5,0.5,0.5,0.5]] },
  { id: "hero",        label: "Hero",      desc: "Wide image + caption",    formats: ["A4_PORTRAIT" as FormatKey,"LANDSCAPE" as FormatKey], cells: [[0,0,1,0.6],[0,0.6,1,0.4]] },
].map(l => ({ ...l, cells: l.cells.map(c => ({ x: c[0], y: c[1], w: c[2], h: c[3] })) }));

export type PageState = {
  index: number;
  canvasJson: string | null;
  thumbnailUrl: string | null;
  layoutId: string;
};

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

