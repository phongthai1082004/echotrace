// Categories shown on the customer Explore page — single source shared with the
// admin Sample Book editor so templates/albums can only be tagged with these.
export const SAMPLE_BOOK_CATEGORIES = [
  "NATURE",
  "URBAN",
  "CLASSIC",
  "MINIMAL",
  "ADVENTURE",
  "CULTURAL",
  "CUSTOM",
] as const;

export type SampleBookCategory = (typeof SAMPLE_BOOK_CATEGORIES)[number];
