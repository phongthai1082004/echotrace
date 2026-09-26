// ponytail: font calligraphy chỉ tải khi vào studio — Google Fonts stylesheet
// inject runtime + document.fonts.load để canvas dùng ngay, khỏi phình layout chung.

const CSS_FAMILIES = [
  "Dancing+Script:wght@400..700",
  "Great+Vibes",
  "Pacifico",
  "Lobster",
  "Satisfy",
  "Allura",
];

const LOAD_NAMES = ["Dancing Script", "Great Vibes", "Pacifico", "Lobster", "Satisfy", "Allura"];

// ponytail: sample có dấu — ép browser kéo vietnamese subset, không chỉ latin.
const LOAD_SAMPLE = "Tiếng Việt có dấu 123";

let started = false;

export function ensureStudioFonts() {
  if (typeof document === "undefined" || started) return;
  started = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${CSS_FAMILIES.map((f) => `family=${f}`).join("&")}&display=swap`;
  link.onload = () => {
    for (const name of LOAD_NAMES) {
      // ponytail: fonts có thể undefined (SSR/old browser) — thiếu cũng chỉ fallback.
      (document.fonts?.load(`16px "${name}"`, LOAD_SAMPLE) as Promise<unknown> | undefined)?.catch(() => {});
      (document.fonts?.load(`700 16px "${name}"`, LOAD_SAMPLE) as Promise<unknown> | undefined)?.catch(() => {});
    }
  };
  document.head.appendChild(link);
}
