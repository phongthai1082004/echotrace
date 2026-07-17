export function calculateSpineWidth(options: {
  gsm: number;
  pageCount: number;
  density?: number;
  bindingType?: "perfect" | "layflat";
  bindingAllowanceMm?: number;
}): number {
  const density = options.density ?? 0.8;
  const bindingType = options.bindingType ?? "perfect";
  const bindingAllowanceMm = options.bindingAllowanceMm ?? 0.5;
  const paperThicknessMm = options.gsm / (density * 1000);
  const sheets = bindingType === "perfect" ? options.pageCount / 2 : options.pageCount;
  return sheets * paperThicknessMm + bindingAllowanceMm;
}
