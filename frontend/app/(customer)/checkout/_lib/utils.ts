export function itemThumb(item: any): string | null {
  return item.thumbnailUrl ?? item.coverUrl ?? null;
}

export function priceText(v: number | null | undefined, unknownLabel = "unknown"): string {
  return v == null || isNaN(v) ? unknownLabel : `₫${v.toLocaleString()}`;
}

export function itemPrice(i: any): number | null {
  return i?.price ?? null;
}
