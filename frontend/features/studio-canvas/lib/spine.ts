export function calculateSpineWidth(options: { gsm: number; pageCount: number; density?: number }): number {
  const density = options.density ?? 0.8;
  const paperThicknessMm = options.gsm / (density * 1000);

  return options.pageCount * paperThicknessMm;
}
