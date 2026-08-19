export const AssetCategory = {
  TRAVEL: 'travel',
  WEDDING: 'wedding',
  NATURE: 'nature',
  FLORAL: 'floral',
  FOOD: 'food',
  BABY: 'baby',
  PARTY: 'party',
  SEASONAL: 'seasonal',
  GEOMETRIC: 'geometric',
  ABSTRACT: 'abstract',
} as const;

export type AssetCategory = typeof AssetCategory[keyof typeof AssetCategory];
