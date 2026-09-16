// F41: lib/attribution — first-wins, last-update on new UTM, keep when no UTM, 90d TTL.
import { captureAttribution, readFirstTouch, readSyncedUserId, markAttributionSynced } from "@/lib/attribution";

const KEY = "bm_attribution";
const DAY = 24 * 60 * 60 * 1000;

function setUrl(search: string) {
  window.history.replaceState({}, "", search ? `/?${search}` : "/");
}

function stored() {
  return JSON.parse(localStorage.getItem(KEY)!);
}

beforeEach(() => {
  localStorage.clear();
  setUrl("");
});

it("F41 first-wins: first landing with UTM pins first+last", () => {
  setUrl("utm_source=google&utm_medium=cpc&utm_campaign=launch");
  captureAttribution();
  const first = readFirstTouch();
  expect(first?.source).toBe("google");
  expect(first?.medium).toBe("cpc");
  expect(first?.campaign).toBe("launch");
  expect(stored().last.source).toBe("google");
});

it("F41 last-update: new UTM keeps first, overwrites last", () => {
  setUrl("utm_source=google");
  captureAttribution();
  setUrl("utm_source=facebook&utm_medium=social");
  captureAttribution();
  expect(readFirstTouch()?.source).toBe("google");
  expect(stored().last.source).toBe("facebook");
  expect(stored().last.medium).toBe("social");
});

it("F41 keep: landing without UTM leaves store untouched", () => {
  setUrl("utm_source=google");
  captureAttribution();
  setUrl("");
  captureAttribution();
  expect(readFirstTouch()?.source).toBe("google");
  expect(stored().last.source).toBe("google");
});

it("F41 keep: empty store + no UTM stays empty", () => {
  captureAttribution();
  expect(readFirstTouch()).toBeNull();
  expect(localStorage.getItem(KEY)).toBeNull();
});

it("F41 TTL: first touch older than 90d resets (BVA 89d kept / 91d dropped)", () => {
  const old = (days: number) => ({
    first: { source: "google", touchedAt: new Date(Date.now() - days * DAY).toISOString() },
    last: { source: "google", touchedAt: new Date(Date.now() - days * DAY).toISOString() },
  });
  localStorage.setItem(KEY, JSON.stringify(old(89)));
  expect(readFirstTouch()?.source).toBe("google");
  localStorage.setItem(KEY, JSON.stringify(old(91)));
  expect(readFirstTouch()).toBeNull();
});

it("F41 TTL: expired first is replaced by fresh UTM on next capture", () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      first: { source: "google", touchedAt: new Date(Date.now() - 100 * DAY).toISOString() },
      last: { source: "google", touchedAt: new Date(Date.now() - 100 * DAY).toISOString() },
    }),
  );
  setUrl("utm_source=tiktok");
  captureAttribution();
  expect(readFirstTouch()?.source).toBe("tiktok");
});

it("F41 sync marker: mark/read round-trip, null when never synced", () => {
  expect(readSyncedUserId()).toBeNull();
  markAttributionSynced(42);
  expect(readSyncedUserId()).toBe(42);
  expect(readFirstTouch()).toBeNull(); // marker write doesn't invent touches
});
