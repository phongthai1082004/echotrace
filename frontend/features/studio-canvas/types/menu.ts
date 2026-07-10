export interface NavItemConfig {
  label: string;
  iconElements: {
    tag: "path" | "rect" | "polyline" | "line" | "polygon" | "circle";
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
    label: "Text",
    iconElements: [
      { tag: "polyline", props: { points: "4 7 4 4 20 4 20 7" } },
      { tag: "line", props: { x1: 9, y1: 20, x2: 15, y2: 20 } },
      { tag: "line", props: { x1: 12, y1: 4, x2: 12, y2: 20 } }
    ]
  },
  {
    label: "Layers",
    iconElements: [
      { tag: "polygon", props: { points: "12 2 2 7 12 12 22 7 12 2" } },
      { tag: "polyline", props: { points: "2 17 12 22 22 17" } },
      { tag: "polyline", props: { points: "2 12 12 17 22 12" } }
    ]
  }
];