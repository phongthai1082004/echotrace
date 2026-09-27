// inject runtime + document.fonts.load để canvas dùng ngay, khỏi phình layout chung.

const CSS_FAMILIES = [
  "Dancing+Script:wght@400..700",
  "Great+Vibes",
  "Pacifico",
  "Lobster",
  "Satisfy",
  "Allura",
  "Playfair+Display:wght@400;700",
  "Cormorant+Garamond:wght@400;700",
  "Righteous",
  "Permanent+Marker",
  "Abril+Fatface",
  "Bebas+Neue",
  "Oswald:wght@400;700",
  "Montserrat:wght@400;700",
  "Poppins:wght@400;700",
  "Raleway:wght@400;700",
  "Quicksand:wght@400;700",
  "Comfortaa:wght@400;700",
  "DM+Mono:wght@400;700",
];

// Space Grotesk / Inter / JetBrains Mono đã có qua next/font ở layout chung.

const LOAD_NAMES = [
  "Dancing Script",
  "Great Vibes",
  "Pacifico",
  "Lobster",
  "Satisfy",
  "Allura",
  "Playfair Display",
  "Cormorant Garamond",
  "Righteous",
  "Permanent Marker",
  "Abril Fatface",
  "Bebas Neue",
  "Oswald",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Quicksand",
  "Comfortaa",
  "DM Mono",
];

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
      (document.fonts?.load(`16px "${name}"`, LOAD_SAMPLE) as Promise<unknown> | undefined)?.catch(() => {});
      (document.fonts?.load(`700 16px "${name}"`, LOAD_SAMPLE) as Promise<unknown> | undefined)?.catch(() => {});
    }
  };
  document.head.appendChild(link);
}
