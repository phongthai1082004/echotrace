// ponytail: thin wrapper over window.gtag — no lib, no-ops when GA blocked/absent.
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  try {
    (window as any)?.gtag?.("event", name, params);
  } catch {}
}
