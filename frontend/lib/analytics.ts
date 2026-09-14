// ponytail: thin wrapper over window.gtag — no lib, no-ops when GA blocked/absent.
let disabled = false;
export function setAnalyticsDisabled(v: boolean) {
  disabled = v;
}
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (disabled) return; // admin — không đo để khỏi bẩn số marketing
  try {
    (window as any)?.gtag?.("event", name, params);
  } catch {}
}
