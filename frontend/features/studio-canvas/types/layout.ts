export type LayoutSlot = {
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type LayoutConfig = {
  layoutId: string;
  name: string;
  slots: LayoutSlot[];
};

export const LAYOUTS: Record<string, LayoutConfig> = {
  "photobooth-strip": {
    layoutId: "photobooth-strip",
    name: "Photobooth Strip",
    slots: [
      { type: "rect", left: 15, top: 15, width: 180, height: 59 },
      { type: "rect", left: 15, top: 84, width: 180, height: 59 },
      { type: "rect", left: 15, top: 153, width: 180, height: 59 },
      { type: "rect", left: 15, top: 222, width: 180, height: 59 },
    ],
  },
  "grid-6": {
    layoutId: "grid-6",
    name: "Grid 6",
    slots: [
      { type: "rect", left: 15, top: 15, width: 86, height: 83 },
      { type: "rect", left: 109, top: 15, width: 86, height: 83 },
      { type: "rect", left: 15, top: 106, width: 86, height: 83 },
      { type: "rect", left: 109, top: 106, width: 86, height: 83 },
      { type: "rect", left: 15, top: 197, width: 86, height: 83 },
      { type: "rect", left: 109, top: 197, width: 86, height: 83 },
    ],
  },
  "hero-grid-5": {
    layoutId: "hero-grid-5",
    name: "Hero + Grid",
    slots: [
      { type: "rect", left: 15, top: 15, width: 180, height: 100 },
      { type: "rect", left: 15, top: 123, width: 86, height: 76 },
      { type: "rect", left: 109, top: 123, width: 86, height: 76 },
      { type: "rect", left: 15, top: 207, width: 86, height: 76 },
      { type: "rect", left: 109, top: 207, width: 86, height: 76 },
    ],
  },
  "single-center": {
    layoutId: "single-center",
    name: "Single Center",
    slots: [
      { type: "rect", left: 25, top: 48, width: 160, height: 200 },
    ],
  },
  "2-stacked": {
    layoutId: "2-stacked",
    name: "2 Stacked",
    slots: [
      { type: "rect", left: 15, top: 15, width: 180, height: 130 },
      { type: "rect", left: 15, top: 152, width: 180, height: 130 },
    ],
  },
  "2-top-1-bottom": {
    layoutId: "2-top-1-bottom",
    name: "2 Top 1 Bottom",
    slots: [
      { type: "rect", left: 15, top: 15, width: 86, height: 120 },
      { type: "rect", left: 109, top: 15, width: 86, height: 120 },
      { type: "rect", left: 15, top: 147, width: 180, height: 135 },
    ],
  },
  "1-top-2-bottom": {
    layoutId: "1-top-2-bottom",
    name: "1 Top 2 Bottom",
    slots: [
      { type: "rect", left: 15, top: 15, width: 180, height: 135 },
      { type: "rect", left: 15, top: 162, width: 86, height: 120 },
      { type: "rect", left: 109, top: 162, width: 86, height: 120 },
    ],
  },
};

// Spread layouts — cover two A4 pages side by side (420×297 mm, landscape)
export const SPREAD_LAYOUTS: Record<string, LayoutConfig> = {
  "spread-2-photo": {
    layoutId: "spread-2-photo",
    name: "2 Photos Spread",
    slots: [
      { type: "rect", left: 15, top: 30, width: 185, height: 237 },
      { type: "rect", left: 220, top: 30, width: 185, height: 237 },
    ],
  },
  "spread-3-photo": {
    layoutId: "spread-3-photo",
    name: "3 Photos Spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 185, height: 130 },
      { type: "rect", left: 220, top: 15, width: 185, height: 130 },
      { type: "rect", left: 110, top: 160, width: 200, height: 125 },
    ],
  },
  "spread-4-photo": {
    layoutId: "spread-4-photo",
    name: "4 Photos Spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 185, height: 130 },
      { type: "rect", left: 220, top: 15, width: 185, height: 130 },
      { type: "rect", left: 15, top: 155, width: 185, height: 130 },
      { type: "rect", left: 220, top: 155, width: 185, height: 130 },
    ],
  },
  "spread-hero": {
    layoutId: "spread-hero",
    name: "Hero Spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 390, height: 267 },
    ],
  },
  "spread-triptych": {
    layoutId: "spread-triptych",
    name: "Triptych Spread",
    slots: [
      { type: "rect", left: 15, top: 30, width: 120, height: 237 },
      { type: "rect", left: 150, top: 30, width: 120, height: 237 },
      { type: "rect", left: 285, top: 30, width: 120, height: 237 },
    ],
  },
};

export const LAYOUT_LIST = Object.values(LAYOUTS);
export const SPREAD_LAYOUT_LIST = Object.values(SPREAD_LAYOUTS);
