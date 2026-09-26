// Frame drop fit: shape-aware hit-test + replace-occupied.
import * as fabric from "fabric";
import { shapeContainsPoint, frameLocalPoint } from "@/features/studio-canvas/lib/frames";
import { reviveObject } from "@/features/studio-canvas/lib/frames";
import { canvasPointer } from "@/features/studio-canvas/lib/fabric-core";
import {
  placePhotoInFrame,
  replacePhotoInFrame,
  findPhotoInFrame,
  placeDroppedPhoto,
  unlockPhotoInFrame,
} from "@/features/studio-canvas/lib/photos";
import { useCanvasStore } from "@/features/studio-canvas/hooks/useCanvasState";

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

describe("canvasPointer", () => {
  const mockCanvas = (vpt?: number[]) =>
    ({
      getElement: () => ({
        getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 100 }),
      }),
      getWidth: () => 400,
      getHeight: () => 200,
      viewportTransform: vpt ?? [1, 0, 0, 1, 0, 0],
    }) as any;

  it("identity viewport -> css mapping", () => {
    // client(110,70) -> css((100)*2,(50)*2) = (200,100)
    expect(canvasPointer(mockCanvas(), 110, 70)).toEqual({ x: 200, y: 100 });
  });
  it("zoomed viewport 2x -> scene coords halved", () => {
    expect(canvasPointer(mockCanvas([2, 0, 0, 2, 0, 0]), 110, 70)).toEqual({ x: 100, y: 50 });
  });
  it("panned viewport -> offset removed", () => {
    expect(canvasPointer(mockCanvas([1, 0, 0, 1, 40, 30]), 110, 70)).toEqual({ x: 160, y: 70 });
  });
});

describe("placeDroppedPhoto", () => {
  const fromURLSpy = vi.spyOn(fabric.FabricImage, "fromURL");
  const fullMockCanvas = (objs: any[], w = 840) => ({
    getObjects: () => objs,
    getWidth: () => w,
    getHeight: () => 600,
    remove: vi.fn((o: any) => void objs.splice(objs.indexOf(o), 1)),
    add: vi.fn((o: any) => void objs.push(o)),
    setActiveObject: vi.fn(),
    renderAll: vi.fn(),
    moveObjectTo: vi.fn(),
  });

  beforeEach(() => {
    fromURLSpy.mockReset();
    const s = useCanvasStore.getState();
    s.setActivePageIndex(0);
    s.setViewMode("left");
  });
  afterAll(() => fromURLSpy.mockRestore());

  it("failed: broken image -> no object, no crash", async () => {
    fromURLSpy.mockRejectedValue(new Error("404"));
    const objs: any[] = [];
    const canvas = fullMockCanvas(objs);
    const r = await placeDroppedPhoto(canvas as any, 10, 10, "http://x/404.png", () => undefined);
    expect(r).toBe("failed");
    expect(objs).toHaveLength(0);
  });

  it("free: no frame under point -> loose image at point", async () => {
    fromURLSpy.mockResolvedValue(stubImg());
    const objs: any[] = [];
    const canvas = fullMockCanvas(objs);
    const r = await placeDroppedPhoto(canvas as any, 50, 60, "http://x/a.png", () => undefined);
    expect(r).toBe("free");
    expect(objs).toHaveLength(1);
    expect(objs[0].left).toBe(50);
    expect(objs[0].top).toBe(60);
  });

  it("filled: empty frame -> photo in, active = frame", async () => {
    fromURLSpy.mockResolvedValue(stubImg());
    const objs: any[] = [];
    const canvas = fullMockCanvas(objs);
    const frame = stubFrame(canvas);
    objs.push(frame);
    const r = await placeDroppedPhoto(canvas as any, 50, 50, "http://x/a.png", () => frame as any);
    expect(r).toBe("filled");
    expect(canvas.setActiveObject).toHaveBeenCalledWith(frame);
  });

  it("rejected: frame on wrong half -> toast, nothing added", async () => {
    fromURLSpy.mockResolvedValue(stubImg());
    // 4 pages, editing page 1 in left view -> cover guard off, halfW = 420
    useCanvasStore.getState().setPages([0, 1, 2, 3].map((index) => ({ index } as any)));
    useCanvasStore.getState().setActivePageIndex(1);
    useCanvasStore.getState().setViewMode("left");
    const objs: any[] = [];
    const canvas = fullMockCanvas(objs);
    const frame = stubFrame(canvas);
    frame.set({ left: 500, top: 0 } as any); // center x = 550 >= 420 -> wrong half
    frame.setCoords();
    objs.push(frame);
    const onWrongHalf = vi.fn();
    const r = await placeDroppedPhoto(canvas as any, 550, 50, "http://x/a.png", () => frame as any, onWrongHalf);
    expect(r).toBe("rejected");
    expect(onWrongHalf).toHaveBeenCalledTimes(1);
    expect(objs).toHaveLength(1); // chỉ frame, không ảnh rời
    // trả store về mặc định cho test khác
    useCanvasStore.getState().setActivePageIndex(0);
  });

  it("page switched mid-load -> no fill, free image instead", async () => {
    let resolveImg!: (v: any) => void;
    fromURLSpy.mockReturnValue(new Promise((res) => (resolveImg = res)));
    const objs: any[] = [];
    const canvas = fullMockCanvas(objs);
    const frame = stubFrame(canvas);
    objs.push(frame);
    const pending = placeDroppedPhoto(canvas as any, 50, 50, "http://x/a.png", () => frame as any);
    useCanvasStore.getState().setActivePageIndex(1); // user đổi trang lúc ảnh đang load
    resolveImg(stubImg());
    expect(await pending).toBe("free");
    useCanvasStore.getState().setActivePageIndex(0);
  });
});
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

describe("reviveObject photo locks", () => {
  const livePhoto = () => {
    const o = new fabric.Rect({ left: 0, top: 0, width: 50, height: 50 });
    o.set({ selectable: true, evented: true, hasControls: true, hasBorders: true } as any);
    return o;
  };

  it("json ghi false -> revive kh�a l?i", () => {
    const live = livePhoto();
    reviveObject(
      { customProperties: { layer: "photo" }, selectable: false, evented: false, hasControls: false },
      live as any,
      null,
    );
    expect((live as any).selectable).toBe(false);
    expect((live as any).evented).toBe(false);
  });

  it("json kh�ng ghi c? -> revive gi? tuong t�c (kh�ng �p li?t)", () => {
    const live = livePhoto();
    reviveObject({ customProperties: { layer: "photo" } }, live as any, null);
    expect((live as any).selectable).toBe(true);
    expect((live as any).evented).toBe(true);
  });
});

describe("unlockPhotoInFrame without frame", () => {
  it("m?t frame -> m? kh�a ch�nh t?m ?nh thay v� return im", () => {
    const canvas = { getObjects: () => [], renderAll: vi.fn() };
    const photo: any = {
      customProperties: { layer: "photo" },
      set(patch: any) {
        Object.assign(photo, patch);
      },
      setCoords() {},
      selectable: false,
      evented: false,
    };
    unlockPhotoInFrame(canvas as any, photo);
    expect(photo.selectable).toBe(true);
    expect(photo.evented).toBe(true);
    expect(photo.hasControls).toBe(true);
  });
});
