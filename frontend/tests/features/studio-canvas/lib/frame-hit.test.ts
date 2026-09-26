// Frame drop fit: shape-aware hit-test + replace-occupied.
import * as fabric from "fabric";
import { shapeContainsPoint, frameLocalPoint } from "@/features/studio-canvas/lib/frames";
import {
  placePhotoInFrame,
  replacePhotoInFrame,
  findPhotoInFrame,
} from "@/features/studio-canvas/lib/photos";

describe("shapeContainsPoint", () => {
  it("circle: center in, bbox corner out", () => {
    expect(shapeContainsPoint("Circle", 100, 100, 50, 50)).toBe(true);
    expect(shapeContainsPoint("Circle", 100, 100, 5, 5)).toBe(false);
    expect(shapeContainsPoint("Circle", 100, 100, 99, 50)).toBe(true);
  });
  it("ellipse honors radii", () => {
    expect(shapeContainsPoint("Ellipse", 200, 100, 100, 50)).toBe(true);
    expect(shapeContainsPoint("Ellipse", 200, 100, 10, 10)).toBe(false);
  });
  it("triangle: apex in, top corners out", () => {
    expect(shapeContainsPoint("Triangle", 100, 100, 50, 10)).toBe(true);
    expect(shapeContainsPoint("Triangle", 100, 100, 5, 5)).toBe(false);
    expect(shapeContainsPoint("Triangle", 100, 100, 95, 5)).toBe(false);
    expect(shapeContainsPoint("Triangle", 100, 100, 50, 90)).toBe(true);
  });
  it("diamond: center in, corners out", () => {
    expect(shapeContainsPoint("Diamond", 100, 100, 50, 50)).toBe(true);
    expect(shapeContainsPoint("Diamond", 100, 100, 5, 5)).toBe(false);
  });
  it("star: center in, deep notch out", () => {
    expect(shapeContainsPoint("Star", 100, 100, 50, 50)).toBe(true);
    // notch between top point and upper-right point
    expect(shapeContainsPoint("Star", 100, 100, 72, 22)).toBe(false);
  });
  it("rect/rounded/heart/unknown -> null (bbox decides)", () => {
    for (const s of ["Rectangle", "RoundedRect", "Heart", undefined, "Nope"]) {
      expect(shapeContainsPoint(s as any, 100, 100, 5, 5)).toBeNull();
    }
  });
});

describe("frameLocalPoint", () => {
  it("maps canvas point into unscaled frame space", () => {
    const f = new fabric.Rect({ left: 10, top: 20, width: 100, height: 80 });
    f.setCoords();
    expect(frameLocalPoint(f as any, 10, 20)).toMatchObject({ x: 0, y: 0 });
    const c = frameLocalPoint(f as any, 60, 60);
    expect(c!.x).toBeCloseTo(50, 0);
    expect(c!.y).toBeCloseTo(40, 0);
  });
  it("accounts for 2x scale", () => {
    const f = new fabric.Rect({ left: 0, top: 0, width: 100, height: 100, scaleX: 2, scaleY: 2 });
    f.setCoords();
    const c = frameLocalPoint(f as any, 200, 200);
    expect(c!.x).toBeCloseTo(100, 0);
    expect(c!.y).toBeCloseTo(100, 0);
  });
});

// ponytail: stub ảnh thay vì load thật — place/replace chỉ cần set/setCoords/width.
const stubImg = () => {
  const o: any = {
    width: 200,
    height: 100,
    scaleX: 1,
    scaleY: 1,
    set(patch: any) {
      Object.assign(o, patch);
      return o;
    },
    setCoords() {},
  };
  return o;
};

const mockCanvas = (objs: any[]) => ({
  getObjects: () => objs,
  remove: vi.fn((o: any) => {
    const i = objs.indexOf(o);
    if (i >= 0) objs.splice(i, 1);
  }),
  add: vi.fn((o: any) => void objs.push(o)),
});

const stubFrame = (canvas: any) => {
  const f = new fabric.Rect({ left: 0, top: 0, width: 100, height: 100 });
  f.setCoords();
  (f as any)._selId = "frame-1";
  (f as any).customProperties = { z: 50, layer: "frame" };
  (f as any).canvas = canvas;
  return f;
};

describe("replacePhotoInFrame", () => {
  it("empty frame -> place returns true", () => {
    const objs: any[] = [];
    const canvas = mockCanvas(objs);
    const frame = stubFrame(canvas);
    objs.push(frame);
    expect(placePhotoInFrame(frame as any, stubImg())).toBe(true);
  });
  it("occupied frame -> place false, replace swaps photo", () => {
    const objs: any[] = [];
    const canvas = mockCanvas(objs);
    const frame = stubFrame(canvas);
    objs.push(frame);
    const first = stubImg();
    expect(placePhotoInFrame(frame as any, first)).toBe(true);
    objs.push(first);
    // thả lần 2 vào khung cũ: place từ chối...
    expect(placePhotoInFrame(frame as any, stubImg())).toBe(false);
    // ...replace gỡ ảnh cũ, đặt ảnh mới, không đẻ ảnh rời
    const second = stubImg();
    expect(replacePhotoInFrame(canvas as any, frame as any, second)).toBe(true);
    expect(canvas.remove).toHaveBeenCalledWith(first);
    objs.push(second); // handler thật add ảnh vào canvas/group sau khi place (index.tsx:99-106)
    expect(findPhotoInFrame(canvas as any, frame as any)).toBe(second);
    expect(objs).not.toContain(first);
  });
});
