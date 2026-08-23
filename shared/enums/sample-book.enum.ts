export const SampleBookType = {
  TEMPLATE: 'TEMPLATE',
  ALBUM: 'ALBUM',
} as const;

export type SampleBookType = typeof SampleBookType[keyof typeof SampleBookType];

export const SampleBookStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVE: 'archive',
} as const;

export type SampleBookStatus = typeof SampleBookStatus[keyof typeof SampleBookStatus];