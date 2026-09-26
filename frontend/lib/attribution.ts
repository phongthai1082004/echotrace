// redirect không mất). first bất biến, last ghi đè khi landing có UTM mới.
export interface AttributionTouch {
  source: string;
  medium?: string | null;
  campaign?: string | null;
  touchedAt: string;
}

interface AttributionStore {
  first: AttributionTouch | null;
  last: AttributionTouch | null;
  syncedUserId?: number | null;
}

const KEY = "bm_attribution";
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

function load(): AttributionStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { first: null, last: null };
    const s = JSON.parse(raw) as AttributionStore;
    if (s.first && Date.now() - new Date(s.first.touchedAt).getTime() > TTL_MS) {
      return { first: null, last: null };
    }
    return { first: s.first ?? null, last: s.last ?? null, syncedUserId: s.syncedUserId ?? null };
  } catch {
    return { first: null, last: null };
  }
}

function save(s: AttributionStore) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

function touchFromUrl(): AttributionTouch | null {
  try {
    const q = new URLSearchParams(window.location.search);
    const source = (q.get("utm_source") || "").trim().toLowerCase().slice(0, 64);
    if (!source) return null;
    return {
      source,
      medium: (q.get("utm_medium") || "").trim().toLowerCase().slice(0, 64) || null,
      campaign: (q.get("utm_campaign") || "").trim().slice(0, 128) || null,
      touchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// Gọi 1 lần khi app mount: landing có UTM mới thì nạp, không thì giữ nguyên.
export function captureAttribution() {
  const touch = touchFromUrl();
  if (!touch) return;
  const s = load();
  if (!s.first) {
    save({ ...s, first: touch, last: touch });
  } else {
    save({ ...s, last: touch });
  }
}

export function readFirstTouch(): AttributionTouch | null {
  try {
    return load().first;
  } catch {
    return null;
  }
}

export function readSyncedUserId(): number | null {
  try {
    return load().syncedUserId ?? null;
  } catch {
    return null;
  }
}

export function markAttributionSynced(userId: number) {
  const s = load();
  save({ ...s, syncedUserId: userId });
}
