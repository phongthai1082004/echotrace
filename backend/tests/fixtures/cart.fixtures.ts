/**
 * Cart & CartItem Test Fixtures
 * Reusable test data for cart-related tests
 */

export const createTestCart = (overrides?: Partial<any>) => ({
  id: 'cart_' + Math.random().toString(36).substr(2, 9),
  userId: 'user_' + Math.random().toString(36).substr(2, 9),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestCartItem = (overrides?: Partial<any>) => ({
  id: 'cart_item_' + Math.random().toString(36).substr(2, 9),
  cartId: 'cart_' + Math.random().toString(36).substr(2, 9),
  bookId: 'book_' + Math.random().toString(36).substr(2, 9),
  quantity: 1,
  coverOptionId: 'cover_opt_1',
  paperOptionId: 'paper_opt_1',
  sizeOptionId: 'size_opt_1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const validCartItemData = {
  bookId: 'book_123',
  quantity: 1,
  coverOptionId: 'cover_glossy',
  paperOptionId: 'paper_150gsm',
  sizeOptionId: 'size_a4',
};

export const invalidCartItemDatasets = {
  missingBookId: { quantity: 1, coverOptionId: 'cover_1', paperOptionId: 'paper_1' },
  nullBookId: { bookId: null, quantity: 1, coverOptionId: 'cover_1' },
  negativeQuantity: { bookId: 'book_1', quantity: -5, coverOptionId: 'cover_1' },
  zeroQuantity: { bookId: 'book_1', quantity: 0, coverOptionId: 'cover_1' },
  fractionalQuantity: { bookId: 'book_1', quantity: 2.5, coverOptionId: 'cover_1' },
  nullQuantity: { bookId: 'book_1', quantity: null, coverOptionId: 'cover_1' },
  stringQuantity: { bookId: 'book_1', quantity: 'five', coverOptionId: 'cover_1' },
  missingCoverOption: { bookId: 'book_1', quantity: 1, paperOptionId: 'paper_1' },
  largeQuantity: { bookId: 'book_1', quantity: 10001, coverOptionId: 'cover_1' },
};

export const cartBoundaryValues = {
  minQuantity: 1,
  minQuantityBoundary: 0,
  minQuantityInvalid: -1,
  maxQuantity: 10000,
  maxQuantityBoundary: 10001,
  maxQuantityBoundaryMinus: 9999,
};

export const priceCalculationTestCases = [
  {
    name: 'Single page book with standard cover and paper',
    pages: 1,
    coverPrice: 50000,
    paperPrice: 2000,
    sizeFactor: 1,
    expectedPrice: 52000,
  },
  {
    name: 'Multi-page book with size factor',
    pages: 20,
    perPagePrice: 2000,
    coverPrice: 50000,
    paperPrice: 3000,
    sizeFactor: 1.5,
    expectedPrice: null, // Will be calculated based on formula
  },
  {
    name: 'Book with A3 size (large)',
    pages: 30,
    perPagePrice: 2000,
    coverPrice: 80000,
    paperPrice: 5000,
    sizeFactor: 2,
    expectedPrice: null,
  },
];

export const couponTestData = {
  validFixedCoupon: {
    code: 'FIXED_50K',
    type: 'FIXED',
    discountValue: 50000,
    maxUsageCount: null, // Unlimited
  },
  validPercentCoupon: {
    code: 'PERCENT_10',
    type: 'PERCENT',
    discountValue: 10,
    maxUsageCount: 100,
  },
  expiredCoupon: {
    code: 'EXPIRED',
    type: 'FIXED',
    discountValue: 30000,
    expirationDate: new Date(Date.now() - 1000), // Expired 1 second ago
  },
  limitedUsageCoupon: {
    code: 'LIMITED',
    type: 'FIXED',
    discountValue: 20000,
    maxUsageCount: 1,
    usedCount: 1,
  },
};

export const paymentMethodTestData = {
  FULL_PAYMENT: { method: 'FULL_PAYMENT', percentagePaid: 100 },
  HALF_PAYMENT: { method: 'HALF_PAYMENT', percentagePaid: 50 },
  COD: { method: 'COD', percentagePaid: 0 },
};
