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
  kind: "single" | "spread";
  slots: LayoutSlot[];
};

export const LAYOUTS: Record<string, LayoutConfig> = {
  "photobooth-strip": {
    layoutId: "photobooth-strip",
    name: "Photobooth Strip",
    kind: "single",
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
    kind: "single",
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
    kind: "single",
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
    kind: "single",
    slots: [{ type: "rect", left: 25, top: 48, width: 160, height: 200 }],
  },
  "2-stacked": {
    layoutId: "2-stacked",
    name: "2 Stacked",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 180, height: 130 },
      { type: "rect", left: 15, top: 152, width: 180, height: 130 },
    ],
  },
  "2-top-1-bottom": {
    layoutId: "2-top-1-bottom",
    name: "2 Top 1 Bottom",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 86, height: 120 },
      { type: "rect", left: 109, top: 15, width: 86, height: 120 },
      { type: "rect", left: 15, top: 147, width: 180, height: 135 },
    ],
  },
  "1-top-2-bottom": {
    layoutId: "1-top-2-bottom",
    name: "1 Top 2 Bottom",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 180, height: 135 },
      { type: "rect", left: 15, top: 162, width: 86, height: 120 },
      { type: "rect", left: 109, top: 162, width: 86, height: 120 },
    ],
  },
  "full-bleed": {
    layoutId: "full-bleed",
    name: "Full Bleed",
    kind: "single",
    slots: [{ type: "rect", left: 15, top: 15, width: 180, height: 267 }],
  },
  "duo-side": {
    layoutId: "duo-side",
    name: "Duo Side",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 86, height: 267 },
      { type: "rect", left: 109, top: 15, width: 86, height: 267 },
    ],
  },
  "trio-stack": {
    layoutId: "trio-stack",
    name: "Trio Stack",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 180, height: 83 },
      { type: "rect", left: 15, top: 106, width: 180, height: 83 },
      { type: "rect", left: 15, top: 197, width: 180, height: 85 },
    ],
  },
  "trio-columns": {
    layoutId: "trio-columns",
    name: "Trio Columns",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 54, height: 267 },
      { type: "rect", left: 77, top: 15, width: 54, height: 267 },
      { type: "rect", left: 139, top: 15, width: 56, height: 267 },
    ],
  },
  "quad-grid": {
    layoutId: "quad-grid",
    name: "Quad Grid",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 86, height: 129 },
      { type: "rect", left: 109, top: 15, width: 86, height: 129 },
      { type: "rect", left: 15, top: 152, width: 86, height: 130 },
      { type: "rect", left: 109, top: 152, width: 86, height: 130 },
    ],
  },
  "quad-columns": {
    layoutId: "quad-columns",
    name: "Quad Columns",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 39, height: 267 },
      { type: "rect", left: 62, top: 15, width: 39, height: 267 },
      { type: "rect", left: 109, top: 15, width: 39, height: 267 },
      { type: "rect", left: 156, top: 15, width: 39, height: 267 },
    ],
  },
  "grid-8": {
    layoutId: "grid-8",
    name: "Grid 8",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 86, height: 60 },
      { type: "rect", left: 109, top: 15, width: 86, height: 60 },
      { type: "rect", left: 15, top: 83, width: 86, height: 60 },
      { type: "rect", left: 109, top: 83, width: 86, height: 60 },
      { type: "rect", left: 15, top: 151, width: 86, height: 60 },
      { type: "rect", left: 109, top: 151, width: 86, height: 60 },
      { type: "rect", left: 15, top: 219, width: 86, height: 63 },
      { type: "rect", left: 109, top: 219, width: 86, height: 63 },
    ],
  },
  "grid-9": {
    layoutId: "grid-9",
    name: "Grid 9",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 54, height: 83 },
      { type: "rect", left: 77, top: 15, width: 54, height: 83 },
      { type: "rect", left: 139, top: 15, width: 56, height: 83 },
      { type: "rect", left: 15, top: 106, width: 54, height: 83 },
      { type: "rect", left: 77, top: 106, width: 54, height: 83 },
      { type: "rect", left: 139, top: 106, width: 56, height: 83 },
      { type: "rect", left: 15, top: 197, width: 54, height: 85 },
      { type: "rect", left: 77, top: 197, width: 54, height: 85 },
      { type: "rect", left: 139, top: 197, width: 56, height: 85 },
    ],
  },
  "hero-left-duo": {
    layoutId: "hero-left-duo",
    name: "Hero Left",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 118, height: 267 },
      { type: "rect", left: 141, top: 15, width: 54, height: 129 },
      { type: "rect", left: 141, top: 152, width: 54, height: 130 },
    ],
  },
  "hero-right-duo": {
    layoutId: "hero-right-duo",
    name: "Hero Right",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 54, height: 129 },
      { type: "rect", left: 15, top: 152, width: 54, height: 130 },
      { type: "rect", left: 77, top: 15, width: 118, height: 267 },
    ],
  },
  "sidebar-1-3": {
    layoutId: "sidebar-1-3",
    name: "1 + 3 Sidebar",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 86, height: 267 },
      { type: "rect", left: 109, top: 15, width: 86, height: 83 },
      { type: "rect", left: 109, top: 106, width: 86, height: 83 },
      { type: "rect", left: 109, top: 197, width: 86, height: 85 },
    ],
  },
  "editorial-5": {
    layoutId: "editorial-5",
    name: "Editorial 5",
    kind: "single",
    slots: [
      { type: "rect", left: 15, top: 15, width: 86, height: 75 },
      { type: "rect", left: 109, top: 15, width: 86, height: 75 },
      { type: "rect", left: 15, top: 98, width: 180, height: 86 },
      { type: "rect", left: 15, top: 192, width: 86, height: 90 },
      { type: "rect", left: 109, top: 192, width: 86, height: 90 },
    ],
  },
};


export const SPREAD_LAYOUTS: Record<string, LayoutConfig> = {
  "spread-2-photo": {
    layoutId: "spread-2-photo",
    name: "2 Photos Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 30, width: 185, height: 237 },
      { type: "rect", left: 220, top: 30, width: 185, height: 237 },
    ],
  },
  "spread-3-photo": {
    layoutId: "spread-3-photo",
    name: "3 Photos Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 185, height: 130 },
      { type: "rect", left: 220, top: 15, width: 185, height: 130 },
      { type: "rect", left: 110, top: 160, width: 200, height: 125 },
    ],
  },
  "spread-4-photo": {
    layoutId: "spread-4-photo",
    name: "4 Photos Spread",
    kind: "spread",
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
    kind: "spread",
    slots: [{ type: "rect", left: 15, top: 15, width: 390, height: 267 }],
  },
  "spread-triptych": {
    layoutId: "spread-triptych",
    name: "Triptych Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 30, width: 120, height: 237 },
      { type: "rect", left: 150, top: 30, width: 120, height: 237 },
      { type: "rect", left: 285, top: 30, width: 120, height: 237 },
    ],
  },
  "spread-6-grid": {
    layoutId: "spread-6-grid",
    name: "6 Photos Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 124, height: 129 },
      { type: "rect", left: 147, top: 15, width: 124, height: 129 },
      { type: "rect", left: 279, top: 15, width: 126, height: 129 },
      { type: "rect", left: 15, top: 152, width: 124, height: 130 },
      { type: "rect", left: 147, top: 152, width: 124, height: 130 },
      { type: "rect", left: 279, top: 152, width: 126, height: 130 },
    ],
  },
  "spread-8-grid": {
    layoutId: "spread-8-grid",
    name: "8 Photos Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 91, height: 129 },
      { type: "rect", left: 114, top: 15, width: 91, height: 129 },
      { type: "rect", left: 213, top: 15, width: 92, height: 129 },
      { type: "rect", left: 313, top: 15, width: 92, height: 129 },
      { type: "rect", left: 15, top: 152, width: 91, height: 130 },
      { type: "rect", left: 114, top: 152, width: 91, height: 130 },
      { type: "rect", left: 213, top: 152, width: 92, height: 130 },
      { type: "rect", left: 313, top: 152, width: 92, height: 130 },
    ],
  },
  "spread-hero-left": {
    layoutId: "spread-hero-left",
    name: "Hero Left Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 250, height: 267 },
      { type: "rect", left: 273, top: 15, width: 132, height: 129 },
      { type: "rect", left: 273, top: 152, width: 132, height: 130 },
    ],
  },
  "spread-hero-right": {
    layoutId: "spread-hero-right",
    name: "Hero Right Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 132, height: 129 },
      { type: "rect", left: 15, top: 152, width: 132, height: 130 },
      { type: "rect", left: 155, top: 15, width: 250, height: 267 },
    ],
  },
  "spread-strip-5": {
    layoutId: "spread-strip-5",
    name: "Strip 5 Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 71, height: 267 },
      { type: "rect", left: 94, top: 15, width: 71, height: 267 },
      { type: "rect", left: 173, top: 15, width: 72, height: 267 },
      { type: "rect", left: 253, top: 15, width: 72, height: 267 },
      { type: "rect", left: 333, top: 15, width: 72, height: 267 },
    ],
  },
  "spread-hero-top": {
    layoutId: "spread-hero-top",
    name: "Hero Top Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 390, height: 140 },
      { type: "rect", left: 15, top: 163, width: 124, height: 119 },
      { type: "rect", left: 147, top: 163, width: 124, height: 119 },
      { type: "rect", left: 279, top: 163, width: 126, height: 119 },
    ],
  },
  "spread-center-focus": {
    layoutId: "spread-center-focus",
    name: "Center Focus Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 30, width: 85, height: 237 },
      { type: "rect", left: 110, top: 30, width: 200, height: 237 },
      { type: "rect", left: 320, top: 30, width: 85, height: 237 },
    ],
  },
  "spread-duo-full": {
    layoutId: "spread-duo-full",
    name: "Duo Full Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 185, height: 267 },
      { type: "rect", left: 220, top: 15, width: 185, height: 267 },
    ],
  },
  "spread-left-full-duo": {
    layoutId: "spread-left-full-duo",
    name: "Left Full + Duo",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 185, height: 267 },
      { type: "rect", left: 220, top: 15, width: 185, height: 129 },
      { type: "rect", left: 220, top: 152, width: 185, height: 130 },
    ],
  },
  "spread-duo-right-full": {
    layoutId: "spread-duo-right-full",
    name: "Duo + Right Full",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 185, height: 129 },
      { type: "rect", left: 15, top: 152, width: 185, height: 130 },
      { type: "rect", left: 220, top: 15, width: 185, height: 267 },
    ],
  },
  "spread-trio-stack-6": {
    layoutId: "spread-trio-stack-6",
    name: "Trio Stack Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 185, height: 83 },
      { type: "rect", left: 15, top: 106, width: 185, height: 83 },
      { type: "rect", left: 15, top: 197, width: 185, height: 85 },
      { type: "rect", left: 220, top: 15, width: 185, height: 83 },
      { type: "rect", left: 220, top: 106, width: 185, height: 83 },
      { type: "rect", left: 220, top: 197, width: 185, height: 85 },
    ],
  },
  "spread-editorial-5-left": {
    layoutId: "spread-editorial-5-left",
    name: "Editorial 5 Left",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 185, height: 267 },
      { type: "rect", left: 220, top: 15, width: 88, height: 129 },
      { type: "rect", left: 316, top: 15, width: 89, height: 129 },
      { type: "rect", left: 220, top: 152, width: 88, height: 130 },
      { type: "rect", left: 316, top: 152, width: 89, height: 130 },
    ],
  },
  "spread-editorial-5-right": {
    layoutId: "spread-editorial-5-right",
    name: "Editorial 5 Right",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 88, height: 129 },
      { type: "rect", left: 111, top: 15, width: 89, height: 129 },
      { type: "rect", left: 15, top: 152, width: 88, height: 130 },
      { type: "rect", left: 111, top: 152, width: 89, height: 130 },
      { type: "rect", left: 220, top: 15, width: 185, height: 267 },
    ],
  },
  "spread-strip-4": {
    layoutId: "spread-strip-4",
    name: "Strip 4 Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 390, height: 60 },
      { type: "rect", left: 15, top: 83, width: 390, height: 60 },
      { type: "rect", left: 15, top: 151, width: 390, height: 60 },
      { type: "rect", left: 15, top: 219, width: 390, height: 63 },
    ],
  },
  "spread-10-grid": {
    layoutId: "spread-10-grid",
    name: "10 Photos Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 71, height: 129 },
      { type: "rect", left: 94, top: 15, width: 71, height: 129 },
      { type: "rect", left: 173, top: 15, width: 72, height: 129 },
      { type: "rect", left: 253, top: 15, width: 72, height: 129 },
      { type: "rect", left: 333, top: 15, width: 72, height: 129 },
      { type: "rect", left: 15, top: 152, width: 71, height: 130 },
      { type: "rect", left: 94, top: 152, width: 71, height: 130 },
      { type: "rect", left: 173, top: 152, width: 72, height: 130 },
      { type: "rect", left: 253, top: 152, width: 72, height: 130 },
      { type: "rect", left: 333, top: 152, width: 72, height: 130 },
    ],
  },
  "spread-band-5": {
    layoutId: "spread-band-5",
    name: "Band 5 Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 185, height: 80 },
      { type: "rect", left: 220, top: 15, width: 185, height: 80 },
      { type: "rect", left: 15, top: 103, width: 390, height: 91 },
      { type: "rect", left: 15, top: 202, width: 185, height: 80 },
      { type: "rect", left: 220, top: 202, width: 185, height: 80 },
    ],
  },
  "spread-hero-strip-7": {
    layoutId: "spread-hero-strip-7",
    name: "Hero + Strip 6",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 390, height: 140 },
      { type: "rect", left: 15, top: 163, width: 58, height: 119 },
      { type: "rect", left: 81, top: 163, width: 58, height: 119 },
      { type: "rect", left: 147, top: 163, width: 58, height: 119 },
      { type: "rect", left: 213, top: 163, width: 58, height: 119 },
      { type: "rect", left: 279, top: 163, width: 58, height: 119 },
      { type: "rect", left: 345, top: 163, width: 60, height: 119 },
    ],
  },
  "spread-offset-4": {
    layoutId: "spread-offset-4",
    name: "Offset 4 Spread",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 85, height: 267 },
      { type: "rect", left: 108, top: 15, width: 120, height: 267 },
      { type: "rect", left: 236, top: 15, width: 81, height: 267 },
      { type: "rect", left: 325, top: 15, width: 80, height: 267 },
    ],
  },
  "spread-top3-bottom2": {
    layoutId: "spread-top3-bottom2",
    name: "Top 3 Bottom 2",
    kind: "spread",
    slots: [
      { type: "rect", left: 15, top: 15, width: 124, height: 129 },
      { type: "rect", left: 147, top: 15, width: 124, height: 129 },
      { type: "rect", left: 279, top: 15, width: 126, height: 129 },
      { type: "rect", left: 15, top: 152, width: 191, height: 130 },
      { type: "rect", left: 214, top: 152, width: 191, height: 130 },
    ],
  },
};

export const LAYOUT_LIST = Object.values(LAYOUTS);
export const SPREAD_LAYOUT_LIST = Object.values(SPREAD_LAYOUTS);
