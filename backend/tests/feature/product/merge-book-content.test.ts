/**
 * Part 2 — resolveContent: full replace vs object-delta vs fallback (U-20..U-23).
 * Pure function; base = current code behavior in catalog/merge-book-content.ts.
 */
import { resolveContent } from "../../../src/modules/product/catalog/merge-book-content.js";

const canvas = (objects: any[]) => JSON.stringify({ version: "7.4", objects });

const base3 = () => ({
  version: 3,
  pages: [
    { index: 0, canvasJson: "a" },
    { index: 1, canvasJson: "b" },
    { index: 2, canvasJson: "c" },
  ],
});

describe("resolveContent full replace (U-20)", () => {
  it("U-20: dirty page full-replaces, other pages kept, changedPages dropped", () => {
    const merged = resolveContent(base3(), {
      version: 3,
      changedPages: [{ index: 1, canvasJson: "B!", thumbnailUrl: "https://r2/x.jpg" }],
    });
    expect(merged.pages).toHaveLength(3);
    expect(merged.pages[1].canvasJson).toBe("B!");
    expect(merged.pages[1].thumbnailUrl).toBe("https://r2/x.jpg");
    expect(merged.pages[0].canvasJson).toBe("a");
    expect(merged.pages[2].canvasJson).toBe("c");
    expect(merged).not.toHaveProperty("changedPages");
  });

  it("U-20b: incoming without changedPages returns as-is (full replace passthrough)", () => {
    const full = { version: 3, pages: [{ index: 0, canvasJson: "n" }] };
    expect(resolveContent({ old: true }, full)).toBe(full);
    expect(resolveContent(base3(), null)).toBeNull();
  });

  it("U-20c: string existing content is parsed before merge", () => {
    const m = resolveContent(JSON.stringify(base3()), { changedPages: [{ index: 0, canvasJson: "Z" }] });
    expect(m.pages[0].canvasJson).toBe("Z");
    expect(m.pages[1].canvasJson).toBe("b");
  });
});

describe("resolveContent object delta (U-21)", () => {
  const objBase = () => ({
    version: 3,
    pages: [{ index: 0, canvasJson: canvas([{ _selId: "keep", left: 1 }, { _selId: "edit", left: 2 }, { _selId: "del", left: 3 }]) }],
  });

  it("U-21: changed/removed matched by _selId, untouched kept, delta key dropped", () => {
    const m = resolveContent(objBase(), {
      changedPages: [{ index: 0, changedObjects: { changed: [{ _selId: "edit", left: 22 }], removed: ["del"] } }],
    });
    const objs = JSON.parse(m.pages[0].canvasJson).objects;
    expect(objs).toHaveLength(2);
    expect(objs.find((o: any) => o._selId === "edit").left).toBe(22);
    expect(objs.find((o: any) => o._selId === "keep").left).toBe(1);
    expect(m.pages[0]).not.toHaveProperty("changedObjects");
  });

  it("U-21b: unknown removed key ignored, new _selId appended, object w/o _selId appended via idx fallback", () => {
    const m = resolveContent(objBase(), {
      changedPages: [
        {
          index: 0,
          changedObjects: {
            changed: [{ _selId: "new", left: 9 }, { left: 5 }],
            removed: ["ghost"],
          },
        },
      ],
    });
    const objs = JSON.parse(m.pages[0].canvasJson).objects;
    expect(objs).toHaveLength(5);
    expect(objs.find((o: any) => o._selId === "new").left).toBe(9);
  });
});

describe("resolveContent fallback + junk (U-22)", () => {
  it("U-22: broken stored JSON falls back to full replace", () => {
    const m = resolveContent(
      { pages: [{ index: 0, canvasJson: "{oops" }] },
      { changedPages: [{ index: 0, canvasJson: "FULL", changedObjects: { changed: [], removed: [] } }] },
    );
    expect(m.pages[0].canvasJson).toBe("FULL");
  });

  it("U-22b: junk changedPages entries do not throw", () => {
    expect(() =>
      resolveContent(base3(), { changedPages: [null, {}, { noIndex: true }, { index: "x" as any }] }),
    ).not.toThrow();
  });
});

describe("resolveContent object-count BVA (U-23)", () => {
  const run = (objects: any[], removed: string[]) =>
    JSON.parse(
      resolveContent(
        { pages: [{ index: 0, canvasJson: canvas(objects) }] },
        { changedPages: [{ index: 0, changedObjects: { changed: [], removed } }] },
      ).pages[0].canvasJson,
    ).objects;

  it("U-23: 0 objects + remove nothing -> empty array", () => {
    expect(run([], [])).toEqual([]);
  });

  it("U-23b: 1 object removed -> empty array", () => {
    expect(run([{ _selId: "only", v: 1 }], ["only"])).toEqual([]);
  });

  it("U-23c: n objects all removed -> empty array", () => {
    const objs = [1, 2, 3, 4, 5].map((i) => ({ _selId: `o${i}`, v: i }));
    expect(run(objs, ["o1", "o2", "o3", "o4", "o5"])).toEqual([]);
  });
});
