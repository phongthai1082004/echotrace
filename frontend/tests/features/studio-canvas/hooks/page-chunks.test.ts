// F41: studio page-chunks — move swaps spreads, covers excluded,
// duplicate inserts copy right after, paste inserts after active spread.
import { vi } from "vitest";

// ponytail: layout-engine pulls the fabric runtime; chunk ops only need the
// zustand pages array (canvas is null in tests → saveCurrentPage early-returns).
vi.mock("@/features/studio-canvas/lib/layout-engine", () => ({
  serializeCanvasState: () => "{}",
  isCoverPage: (i: number, n: number) => i === 0 || i === n - 1,
  splitCanvasByMidpoint: (j: string) => ({ leftJson: j, rightJson: j }),
}));

import { useCanvasStore } from "@/features/studio-canvas/hooks/useCanvasState";
import { usePageManager } from "@/features/studio-canvas/hooks/usePageManager";

const pm = () => usePageManager();
const mk = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    index: i,
    canvasJson: `p${i}`,
    thumbnailUrl: null,
    layout: null,
    spreadLayout: null,
  }));
const ids = () => useCanvasStore.getState().pages.map((p) => p.canvasJson);

beforeEach(() => {
  useCanvasStore.getState().resetStore();
  useCanvasStore.setState({ pageClipboard: null, canvas: null, activePageIndex: 0 });
});

it("F41 covers excluded from chunks", () => {
  useCanvasStore.setState({ pages: mk(6) });
  const m = pm();
  expect(m.chunkOfPage(0)).toBeNull();
  expect(m.chunkOfPage(5)).toBeNull();
  expect(m.chunkOfPage(1)).toEqual({ leftIdx: 1, rightIdx: 2 });
  expect(m.chunkOfPage(4)).toEqual({ leftIdx: 3, rightIdx: 4 });
});

it("F41 move swaps spreads + selects dragged chunk", () => {
  useCanvasStore.setState({ pages: mk(6), activePageIndex: 1 });
  pm().moveSpread(1, 3);
  expect(ids()).toEqual(["p0", "p3", "p4", "p1", "p2", "p5"]);
  expect(useCanvasStore.getState().activePageIndex).toBe(3);
  expect(useCanvasStore.getState().pages.every((p, i) => p.index === i)).toBe(true);
});

it("F41 move with cover index is a no-op", () => {
  useCanvasStore.setState({ pages: mk(6) });
  pm().moveSpread(0, 1);
  pm().moveSpread(1, 1);
  expect(ids()).toEqual(["p0", "p1", "p2", "p3", "p4", "p5"]);
});

it("F41 duplicate inserts copy right after source chunk", () => {
  useCanvasStore.setState({ pages: mk(6), activePageIndex: 1 });
  pm().duplicateSpread(1);
  expect(ids()).toEqual(["p0", "p1", "p2", "p1", "p2", "p3", "p4", "p5"]);
  expect(useCanvasStore.getState().activePageIndex).toBe(3);
});

it("F41 copy+paste inserts after active spread", () => {
  useCanvasStore.setState({ pages: mk(6), activePageIndex: 1 });
  const m = pm();
  expect(m.copySpread(1)).toBe(true);
  useCanvasStore.setState({ activePageIndex: 3 });
  expect(m.pasteCopiedSpread()).toBe(true);
  expect(ids()).toEqual(["p0", "p1", "p2", "p3", "p4", "p1", "p2", "p5"]);
  expect(useCanvasStore.getState().activePageIndex).toBe(5);
});

it("F41 paste with empty clipboard fails", () => {
  useCanvasStore.setState({ pages: mk(6) });
  expect(pm().pasteCopiedSpread()).toBe(false);
});
