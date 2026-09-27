import type { LayoutConfig } from "./layout";

export type PaperSizeCategory = "square" | "landscape" | "portrait";

export type FormatKey =
  "SQUARE_15" | "SQUARE_20" | "SQUARE_30" | "LANDSCAPE_A4" | "LANDSCAPE_20x30" | "PORTRAIT_A5" | "PORTRAIT_A4";


export interface PaperFormat {
  width: number;
  height: number;
  cm: string;
  category: PaperSizeCategory;
  name: { vi: string; en: string; es: string };
  description: { vi: string; en: string; es: string };
}

export const FORMATS: Record<FormatKey, PaperFormat> = {
  SQUARE_15: {
    width: 600,
    height: 600,
    cm: "15×15",
    category: "square",
    name: { vi: "Vuông 15×15", en: "Square 15×15", es: "Cuadrado 15×15" },
    description: {
      vi: "Khổ mini bỏ túi, làm quà tặng nhanh, photobook mini cho các dịp kỷ niệm nhỏ.",
      en: "Pocket mini size, quick gift photobook for small celebrations.",
      es: "Tamaño mini de bolsillo, fotolibro de regalo para celebraciones.",
    },
  },
  SQUARE_20: {
    width: 800,
    height: 800,
    cm: "20×20",
    category: "square",
    name: { vi: "Vuông 20×20", en: "Square 20×20", es: "Cuadrado 20×20" },
    description: {
      vi: "Khổ quốc dân cho photobook cá nhân, lifestyle, du lịch và baby book. Cân đối, cầm vừa tay.",
      en: "Most popular for personal, lifestyle, travel and baby photobooks. Balanced, fits in hand.",
      es: "El más popular para fotolibros personales, lifestyle, viajes y bebés. Equilibrado y cómodo.",
    },
  },
  SQUARE_30: {
    width: 1200,
    height: 1200,
    cm: "30×30",
    category: "square",
    name: { vi: "Vuông 30×30", en: "Square 30×30", es: "Cuadrado 30×30" },
    description: {
      vi: "Khổ lớn cao cấp, sang trọng, cho album cưới hoặc bộ sưu tập nghệ thuật.",
      en: "Premium large size, luxurious, for wedding albums or art collections.",
      es: "Tamaño grande premium, lujoso, para álbumes de boda o colecciones de arte.",
    },
  },
  LANDSCAPE_A4: {
    width: 1188,
    height: 840,
    cm: "21×29.7",
    category: "landscape",
    name: { vi: "A4 Ngang", en: "A4 Landscape", es: "A4 Horizontal" },
    description: {
      vi: "Khi mở phẳng cho toàn cảnh rộng 42×29.7 cm, hợp ảnh phong cảnh, tập thể hoặc phong cách tạp chí.",
      en: "Flat spread opens to a 42×29.7 cm panorama, great for scenery, groups or magazine style.",
      es: "Al abrir ofrece un panorama de 42×29.7 cm, ideal para paisajes, grupos o estilo revista.",
    },
  },
  LANDSCAPE_20x30: {
    width: 1200,
    height: 800,
    cm: "20×30",
    category: "landscape",
    name: { vi: "20×30 Ngang", en: "20×30 Landscape", es: "20×30 Horizontal" },
    description: {
      vi: "Khổ ngang truyền thống của ảnh cưới Việt Nam, không gian trình bày rộng rãi, hoành tráng.",
      en: "Traditional Vietnamese wedding-photo landscape size, spacious and impressive.",
      es: "Tamaño horizontal tradicional para fotos de boda vietnamitas, espacioso e impresionante.",
    },
  },
  PORTRAIT_A5: {
    width: 600,
    height: 840,
    cm: "15×21",
    category: "portrait",
    name: { vi: "A5 Dọc", en: "A5 Portrait", es: "A5 Vertical" },
    description: {
      vi: "Khổ dọc nhỏ gọn, nhẹ nhàng, như một cuốn sổ tay lưu niệm.",
      en: "Compact, light portrait size, like a keepsake notebook.",
      es: "Tamaño vertical compacto y ligero, como una libreta de recuerdos.",
    },
  },
  PORTRAIT_A4: {
    width: 840,
    height: 1188,
    cm: "21×29.7",
    category: "portrait",
    name: { vi: "A4 Dọc", en: "A4 Portrait", es: "A4 Vertical" },
    description: {
      vi: "Chuẩn tạp chí/documentary photobook, hợp với sách ảnh kể chuyện nhiều chữ, châm ngôn, tự sự.",
      en: "Magazine/documentary photobook standard, great for storytelling books with text and captions.",
      es: "Estándar de revista/fotolibro documental, ideal para libros narrativos con texto.",
    },
  },
};

export function resolveFormat(meta: { format: string; width?: number | null; height?: number | null }): PaperFormat {
  const f = FORMATS[meta.format as FormatKey];
  const hasSize = (meta.width ?? null) != null && (meta.height ?? null) != null;
  if (f && !hasSize) return f;
  return {
    width: meta.width ?? f?.width ?? FORMATS.PORTRAIT_A4.width,
    height: meta.height ?? f?.height ?? FORMATS.PORTRAIT_A4.height,
    cm: meta.width ? `${meta.width / 40}×${meta.height ? meta.height / 40 : ""}` : (f?.cm ?? FORMATS.PORTRAIT_A4.cm),
    category: f?.category ?? "portrait",
    name: f?.name ?? { vi: meta.format, en: meta.format, es: meta.format },
    description: f?.description ?? { vi: "", en: "", es: "" },
  };
}

export function paperSizeLabel(code: string, lang: "vi" | "en" | "es" = "en"): string {
  const fmt = FORMATS[code as FormatKey];
  if (!fmt) return code;
  return `${fmt.cm} cm · ${fmt.name[lang] ?? fmt.name.en}`;
}


export type PageState = {
  index: number;
  canvasJson: string | null;
  thumbnailUrl: string | null;
  layout: LayoutConfig | null;
  spreadLayout: LayoutConfig | null;
  locked?: boolean;
};

export const FONTS: { name: string; css: string; preview: string }[] = [
  { name: "Playfair Display", css: "'Playfair Display', serif", preview: "Playfair" },
  { name: "Cormorant Garamond", css: "'Cormorant Garamond', serif", preview: "Cormorant" },
  { name: "Space Grotesk", css: "'Space Grotesk', sans-serif", preview: "Grotesk" },
  { name: "Inter", css: "'Inter', sans-serif", preview: "Inter" },
  { name: "JetBrains Mono", css: "'JetBrains Mono', monospace", preview: "Mono" },
  { name: "DM Mono", css: "'DM Mono', monospace", preview: "DM Mono" },
  { name: "Great Vibes", css: "'Great Vibes', cursive", preview: "Great Vibes" },
  { name: "Dancing Script", css: "'Dancing Script', cursive", preview: "Dancing Script" },
  { name: "Pacifico", css: "'Pacifico', cursive", preview: "Pacifico" },
  { name: "Lobster", css: "'Lobster', cursive", preview: "Lobster" },
  { name: "Righteous", css: "'Righteous', sans-serif", preview: "Righteous" },
  { name: "Permanent Marker", css: "'Permanent Marker', cursive", preview: "Permanent Marker" },
  { name: "Abril Fatface", css: "'Abril Fatface', serif", preview: "Abril Fatface" },
  { name: "Bebas Neue", css: "'Bebas Neue', sans-serif", preview: "Bebas Neue" },
  { name: "Oswald", css: "'Oswald', sans-serif", preview: "Oswald" },
  { name: "Montserrat", css: "'Montserrat', sans-serif", preview: "Montserrat" },
  { name: "Poppins", css: "'Poppins', sans-serif", preview: "Poppins" },
  { name: "Raleway", css: "'Raleway', sans-serif", preview: "Raleway" },
  { name: "Quicksand", css: "'Quicksand', sans-serif", preview: "Quicksand" },
  { name: "Comfortaa", css: "'Comfortaa', sans-serif", preview: "Comfortaa" },
  { name: "Satisfy", css: "'Satisfy', cursive", preview: "Satisfy" },
  { name: "Allura", css: "'Allura', cursive", preview: "Allura" },
];

export const ZOOM_LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 1.0, 1.25, 1.5, 2.0];

export const TEXT_COLOR_PRESETS = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#FF6B00",
  "#FFD600",
  "#4CAF50",
  "#2196F3",
  "#9C27B0",
  "#E91E63",
  "#795548",
  "#607D8B",
  "#FF5722",
  "#8BC34A",
  "#00BCD4",
  "#3F51B5",
] as const;
