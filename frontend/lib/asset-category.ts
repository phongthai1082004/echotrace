export const ASSET_CATEGORIES = [
  "travel",
  "wedding",
  "nature",
  "floral",
  "food",
  "baby",
  "party",
  "seasonal",
  "geometric",
  "abstract",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  travel: "Travel",
  wedding: "Wedding",
  nature: "Nature",
  floral: "Floral",
  food: "Food",
  baby: "Baby",
  party: "Party",
  seasonal: "Seasonal",
  geometric: "Geometric",
  abstract: "Abstract",
};

export const CATEGORY_COLORS: Record<AssetCategory, string> = {
  travel:    "bg-[#3B82F6]",
  wedding:   "bg-[#EC4899]",
  nature:    "bg-[#22C55E]",
  floral:    "bg-[#F97316]",
  food:      "bg-[#F59E0B]",
  baby:      "bg-[#A78BFA]",
  party:     "bg-[#FF6B6B]",
  seasonal:  "bg-[#06B6D4]",
  geometric: "bg-[#8B5CF6]",
  abstract:  "bg-[#6366F1]",
};
