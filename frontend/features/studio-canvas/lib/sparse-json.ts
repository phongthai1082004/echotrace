// ponytail: sparse JSON for book pages — strip fabric props that equal v7 defaults
// before storing to jsonb, refill them on load. Pure functions (no fabric import)
// so the same tables can run on client, in self-checks, and beside the PDF renderer.
//
// Safety contract (PDF path uses fabric loadFromJSON server-side):
// - NEVER_STRIP keys are always kept: type/version/path-data/src/text/clipPath/
//   objects/customProperties/_selId/filters(non-empty).
// - Tables below are a repo snapshot of fabric 7.x defaults, NOT read from
//   runtime — frontend (^7.4.0) and backend (^7.4.0) must stay on the same major.
//   hydrate warns when a page's `version` disagrees.

export const SPARSE_VERSION = 1;
export const SPARSE_FABRIC_MAJOR = 7;

// Keys that are load-bearing for render/identity — never deleted, only recursed into.
const NEVER_STRIP = new Set([
  "type",
  "version",
  "path", // shape data array (rounded in place, never dropped)
  "src",
  "text",
  "clipPath",
  "objects",
  "customProperties",
  "_selId",
  "filters", // non-empty filter chains alter pixels; empty arrays are dropped below
]);

type Defaults = Record<string, unknown>;

// Snapshot of fabric 7.x class defaults. A prop is deleted on save only when it
// deep-equals the entry here; hydrate writes the entry back when the key is missing.
const COMMON_DEFAULTS: Defaults = {
  originX: "left",
  originY: "top",
  left: 0,
  top: 0,
  scaleX: 1,
  scaleY: 1,
  angle: 0,
  skewX: 0,
  skewY: 0,
  flipX: false,
  flipY: false,
  opacity: 1,
  visible: true,
  fill: "rgb(0,0,0)",
  fillRule: "nonzero",
  paintFirst: "fill",
  stroke: null,
  strokeWidth: 1,
  strokeDashArray: null,
  strokeDashOffset: 0,
  strokeLineCap: "butt",
  strokeLineJoin: "miter",
  strokeMiterLimit: 4,
  strokeUniform: false,
  shadow: null,
  backgroundColor: "",
  globalCompositeOperation: "source-over",
  objectCaching: true,
  statefullCache: false,
  noScaleCache: true,
  lockMovementX: false,
  lockMovementY: false,
  lockRotation: false,
  lockScalingX: false,
  lockScalingY: false,
  lockScalingFlip: false,
  hasControls: true,
  hasBorders: true,
  selectable: true,
  evented: true,
  hoverCursor: null,
  moveCursor: null,
  centeredScaling: false,
  centeredRotation: true,
  absolutePositioned: false,
  cropX: 0,
  cropY: 0,
  crossOrigin: "",
};

const TYPE_DEFAULTS: Record<string, Defaults> = {
  rect: { rx: 0, ry: 0 },
  image: {},
  "i-text": {
    fontSize: 16,
    fontFamily: "Times New Roman",
    fontWeight: "normal",
    fontStyle: "normal",
    underline: false,
    overline: false,
    linethrough: false,
    textAlign: "left",
    lineHeight: 1.16,
    charSpacing: 0,
    textBackgroundColor: "",
    styles: {},
    path: null,
  },
  textbox: {
    fontSize: 16,
    fontFamily: "Times New Roman",
    fontWeight: "normal",
    fontStyle: "normal",
    underline: false,
    overline: false,
    linethrough: false,
    textAlign: "left",
    lineHeight: 1.16,
    charSpacing: 0,
    textBackgroundColor: "",
    styles: {},
    path: null,
    minWidth: 20,
    dynamicMinWidth: 2,
    splitByGrapheme: false,
  },
  text: {
    fontSize: 16,
    fontFamily: "Times New Roman",
    fontWeight: "normal",
    fontStyle: "normal",
    underline: false,
    overline: false,
    linethrough: false,
    textAlign: "left",
    lineHeight: 1.16,
    charSpacing: 0,
    textBackgroundColor: "",
    path: null,
  },
  group: {},
  path: {},
  line: { x1: 0, y1: 0, x2: 0, y2: 0 },
  polyline: {},
  polygon: {},
  circle: {},
  ellipse: {},
  triangle: {},
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, (b as unknown[])[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => deepEqual(a[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function roundNumbers(v: unknown): unknown {
  if (typeof v === "number") return Number.isInteger(v) ? v : r2(v);
  if (Array.isArray(v)) return v.map(roundNumbers);
  return v;
}

/** Strip default-valued props from one fabric object JSON (recursive). Mutates in place. */
export function stripFabricObject(o: Record<string, unknown>): void {
  const type = String(o.type || "").toLowerCase();
  const table = { ...COMMON_DEFAULTS, ...(TYPE_DEFAULTS[type] ?? {}) };
  for (const key of Object.keys(o)) {
    const val = o[key];
    if (key === "filters") {
      if (Array.isArray(val) && val.length === 0) delete o[key];
      continue; // non-empty chains are pixel-bearing — never touch
    }
    if (key === "path" && Array.isArray(val)) {
      o[key] = roundNumbers(val); // shape data: trim float noise, never drop
      continue;
    }
    if (NEVER_STRIP.has(key)) {
      if (Array.isArray(val)) val.forEach((c) => isPlainObject(c) && stripFabricObject(c));
      else if (isPlainObject(val) && typeof (val as Record<string, unknown>).type === "string") {
        stripFabricObject(val as Record<string, unknown>);
      }
      continue;
    }
    if (key in table && deepEqual(val, table[key])) {
      delete o[key];
      continue;
    }
    if (typeof val === "number") o[key] = roundNumbers(val);
    else if (Array.isArray(val)) o[key] = val.map((c) => (isPlainObject(c) ? (stripFabricObject(c), c) : roundNumbers(c)));
    else if (isPlainObject(val)) stripFabricObject(val);
  }
}

/** Refill stripped defaults (recursive). Mutates in place. Safe to run on dense JSON too. */
export function hydrateFabricObject(o: Record<string, unknown>): void {
  const type = String(o.type || "").toLowerCase();
  const table = { ...COMMON_DEFAULTS, ...(TYPE_DEFAULTS[type] ?? {}) };
  for (const [key, def] of Object.entries(table)) {
    if (!(key in o)) o[key] = structuredCloneCompat(def);
  }
  const clip = o.clipPath;
  if (isPlainObject(clip) && typeof clip.type === "string") hydrateFabricObject(clip);
  const children = o.objects;
  if (Array.isArray(children)) children.forEach((c) => isPlainObject(c) && hydrateFabricObject(c));
}

function structuredCloneCompat<T>(v: T): T {
  return v !== null && typeof v === "object" ? (JSON.parse(JSON.stringify(v)) as T) : v;
}

/** Strip a whole parsed page ({objects, ...}). Mutates in place. */
export function stripSparsePage(parsed: { objects?: unknown[] }): void {
  if (!Array.isArray(parsed.objects)) return;
  parsed.objects.forEach((o) => isPlainObject(o) && stripFabricObject(o));
}

/** Parse + hydrate a page JSON string. Single choke point for all page reads. */
export function parsePageJson(json: string | null | undefined): any | null {
  if (!json) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (parsed && typeof parsed === "object") {
    const major = parseInt(String(parsed.version || "").split(".")[0] || "", 10);
    if (!Number.isNaN(major) && major !== SPARSE_FABRIC_MAJOR) {
      console.warn(`[sparse] page fabric v${parsed.version}, tables target v${SPARSE_FABRIC_MAJOR} — load may differ`);
    }
    if (Array.isArray(parsed.objects)) parsed.objects.forEach((o: unknown) => isPlainObject(o) && hydrateFabricObject(o));
  }
  return parsed;
}

/** Object key for diffing/merging: stable _selId, else positional fallback. */
export function objectKey(o: Record<string, unknown>, index: number): string {
  const id = (o as Record<string, unknown>)._selId;
  return typeof id === "string" && id ? id : `idx:${index}`;
}

/**
 * Diff two page JSON strings at object granularity.
 * Returns {changed, removed} where removed holds objectKeys absent in next.
 */
export function diffPageObjects(
  prevJson: string | null | undefined,
  nextJson: string | null | undefined,
): { changed: Record<string, unknown>[]; removed: string[] } {
  const prev = parsePageJson(prevJson);
  const next = parsePageJson(nextJson);
  const prevObjs: Record<string, unknown>[] = Array.isArray(prev?.objects)
    ? prev.objects.filter(isPlainObject)
    : [];
  const nextObjs: Record<string, unknown>[] = Array.isArray(next?.objects)
    ? next.objects.filter(isPlainObject)
    : [];
  const prevByKey = new Map(prevObjs.map((o, i) => [objectKey(o, i), JSON.stringify(o)]));
  const nextKeys = new Set(nextObjs.map((o, i) => objectKey(o, i)));
  const changed = nextObjs.filter((o, i) => prevByKey.get(objectKey(o, i)) !== JSON.stringify(o));
  const removed = [...prevByKey.keys()].filter((k) => !nextKeys.has(k));
  // ponytail: comparison needs hydrated objects, but the wire keeps them sparse.
  stripSparsePage({ objects: changed });
  return { changed, removed };
}

/** Apply an object delta onto a parsed page (mutates). Used by backend merge too. */
export function applyObjectDelta(
  parsed: { objects?: unknown[] },
  changed: Record<string, unknown>[],
  removed: string[],
): void {
  if (!Array.isArray(parsed.objects)) parsed.objects = [];
  const objs = parsed.objects.filter(isPlainObject);
  const byKey = new Map(objs.map((o, i) => [objectKey(o, i), i]));
  removed.forEach((k) => {
    const i = byKey.get(k);
    if (i !== undefined) {
      (parsed.objects as unknown[]).splice(i, 1);
      // rebuild index map after removal
      byKey.clear();
      (parsed.objects as unknown[]).filter(isPlainObject).forEach((o, j) => byKey.set(objectKey(o as Record<string, unknown>, j), j));
    }
  });
  changed.forEach((c) => {
    const i = byKey.get(objectKey(c, -1));
    if (i !== undefined) (parsed.objects as unknown[])[i] = c;
    else {
      byKey.set(objectKey(c, (parsed.objects as unknown[]).length), (parsed.objects as unknown[]).length);
      (parsed.objects as unknown[]).push(c);
    }
  });
}

/** Phase-0 style measurement helper: dense vs sparse byte sizes. */
export function measureSparse(denseJson: string): { before: number; after: number; savedPct: number } {
  const parsed = JSON.parse(denseJson);
  const before = denseJson.length;
  if (parsed && Array.isArray(parsed.objects)) stripSparsePage(parsed);
  const after = JSON.stringify(parsed).length;
  return { before, after, savedPct: before ? Math.round(((before - after) / before) * 1000) / 10 : 0 };
}
