export const BookType = {
  TRAVEL: 'travel',
  YEARBOOK: 'yearbook',
  WEDDING: 'wedding',
  FAMILY: 'family',
  BABY: 'baby',
  CUSTOM: 'custom',
} as const;

export type BookType = typeof BookType[keyof typeof BookType];

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
