export const Category = {
  NATURE: 'nature',
  URBAN: 'urban',
  CLASSIC: 'classic',
  MINIMAL: 'minimal',
  ADVENTURE: 'adventure',
  CULTURAL: 'cultural',
  CUSTOM: 'custom',
} as const;

export type Category = typeof Category[keyof typeof Category];
