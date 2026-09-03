/**
 * Book & Sample Book Test Fixtures
 * Reusable test data for book-related tests
 */

export const createTestBook = (overrides?: Partial<any>) => ({
  id: 'book_' + Math.random().toString(36).substr(2, 9),
  userId: 'user_' + Math.random().toString(36).substr(2, 9),
  title: 'Test Book',
  description: 'This is a test book description',
  content: JSON.stringify({
    pages: [
      { type: 'text', content: 'Page 1' },
      { type: 'text', content: 'Page 2' },
    ],
  }),
  pageCount: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

export const createTestSampleBook = (overrides?: Partial<any>) => ({
  id: 'sample_book_' + Math.random().toString(36).substr(2, 9),
  title: 'Sample Book Template',
  description: 'A pre-made book template',
  pages: 20,
  width: 210,
  height: 297,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createPrintOption = (overrides?: Partial<any>) => ({
  id: 'print_opt_' + Math.random().toString(36).substr(2, 9),
  code: 'COVER_GLOSSY_' + Math.random().toString(36).substr(2, 9),
  name: 'Glossy Cover',
  type: 'COVER',
  price: 50000,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const validBookData = {
  title: 'My Beautiful Book',
  description: 'A book about memories',
  pageCount: 20,
};

export const invalidBookDatasets = {
  emptyTitle: { title: '', description: 'Valid description' },
  nullTitle: { title: null, description: 'Valid description' },
  veryLongTitle: {
    title: 'A'.repeat(300),
    description: 'Valid description',
  },
  emptyDescription: { title: 'Valid Title', description: '' },
  negativePageCount: { title: 'Valid Title', description: 'Valid', pageCount: -5 },
  zeroPageCount: { title: 'Valid Title', description: 'Valid', pageCount: 0 },
  largePageCount: { title: 'Valid Title', description: 'Valid', pageCount: 10000 },
  fractionalPageCount: { title: 'Valid Title', description: 'Valid', pageCount: 5.5 },
  nullPageCount: { title: 'Valid Title', description: 'Valid', pageCount: null },
};

export const bookBoundaryValues = {
  minValidPages: 1,
  minPagesBoundary: 0,
  maxValidPages: 500,
  maxPagesBoundary: 501,
};
