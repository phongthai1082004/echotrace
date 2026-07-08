export interface NavItemConfig {
  label: string;
  iconElements: {
    tag: "path" | "rect" | "polyline" | "line" | "polygon" | "circle" | "ellipse";
    props: Record<string, string | number>;
  }[];
}

export const navItems: NavItemConfig[] = [
  {
    label: "Templates",
    iconElements: [
      { tag: "rect", props: { x: 3, y: 3, width: 7, height: 7 } },
      { tag: "rect", props: { x: 14, y: 3, width: 7, height: 7 } },
      { tag: "rect", props: { x: 3, y: 14, width: 7, height: 7 } },
      { tag: "rect", props: { x: 14, y: 14, width: 7, height: 7 } }
    ]
  },
  {
    label: "Photos",
    iconElements: [
      { tag: "rect", props: { x: 3, y: 3, width: 18, height: 18, rx: 0 } },
      { tag: "circle", props: { cx: 8.5, cy: 8.5, r: 1.5 } },
      { tag: "polyline", props: { points: "21 15 16 10 5 21" } }
    ]
  },
  {
    label: "Layers",
    iconElements: [
      { tag: "polygon", props: { points: "12 2 2 7 12 12 22 7 12 2" } },
      { tag: "polyline", props: { points: "2 17 12 22 22 17" } },
      { tag: "polyline", props: { points: "2 12 12 17 22 12" } }
    ]
  },
  {
    label: "Stickers",
    iconElements: [
      { tag: "path", props: { d: "M5 8a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8z" } },
      { tag: "circle", props: { cx: 12, cy: 6, r: 2 } }
    ]
  },
  {
    label: "Layout",
    iconElements: [
      { tag: "rect", props: { x: 3, y: 3, width: 7, height: 18 } },
      { tag: "rect", props: { x: 14, y: 3, width: 7, height: 8 } },
      { tag: "rect", props: { x: 14, y: 13, width: 7, height: 8 } }
    ]
  },
  {
    label: "Theme",
    iconElements: [
      { tag: "circle", props: { cx: 12, cy: 12, r: 9 } },
      { tag: "circle", props: { cx: 9, cy: 9, r: 2.5 } },
      { tag: "circle", props: { cx: 16, cy: 10, r: 2.5 } },
      { tag: "circle", props: { cx: 11, cy: 17, r: 2.5 } }
    ]
  }
];