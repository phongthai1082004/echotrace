// SKU cho order item = <COVER>_<PAPER>_<SIZE>, viết tắt từ tên tiếng Anh (fallback code).
// Pure, không query DB. Unknown → sanitize từ chính nó, không bao giờ throw.

const COVER_ABBR: Record<string, string> = {
  softcover: "SOFT",
  hardcover: "HARD",
  leather: "LEATHER",
  "saddle stitch": "SADST",
  saddlestitch: "SADST",
};

// 3 chữ đầu của chất liệu giấy + định lượng: couche200 → COU200, offset100 → OFF100.
function abbrevPaper(raw: string): string {
  const m = raw.toLowerCase().match(/([a-z]+)(\d+)/);
  if (!m) return sanitize(raw);
  return `${m[1].slice(0, 3)}${m[2]}`.toUpperCase();
}

// "A5 (14.8×21 cm)" → A5; "30×30 cm" → 30X30; "20x20" → 20X20.
function abbrevSize(raw: string): string {
  const token = raw
    .split("(")[0]
    .replace(/×/gi, "X")
    .replace(/\bcm\b/gi, "")
    .trim();
  return sanitize(token);
}

function sanitize(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12);
}

export function makeSku(
  coverCode: string,
  paperCode: string,
  paperSizeCode: string,
  nameEn?: { cover?: string | null; paper?: string | null; paperSize?: string | null },
): string {
  // Ưu tiên tên EN khi có (case "Hardcover", "Saddle stitch"), fallback code.
  const coverRaw = (nameEn?.cover || coverCode || "").toLowerCase().trim();
  const paperRaw = nameEn?.paper || paperCode || "";
  const sizeRaw = nameEn?.paperSize || paperSizeCode || "";

  const cover = COVER_ABBR[coverRaw] ?? sanitize(coverRaw);
  const paper = abbrevPaper(paperRaw);
  const size = abbrevSize(sizeRaw);
  return [cover, paper, size].filter(Boolean).join("_");
}
