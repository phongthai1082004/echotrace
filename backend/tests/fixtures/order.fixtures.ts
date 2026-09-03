/**
 * Order Test Fixtures
 * Reusable test data for order-related tests
 */

export const createTestOrder = (overrides?: Partial<any>) => ({
  id: 'order_' + Math.random().toString(36).substr(2, 9),
  userId: 'user_' + Math.random().toString(36).substr(2, 9),
  code: 'ORD' + Date.now(),
  status: 'PENDING_PAYMENT',
  totalAmount: 500000,
  paidAmount: 0,
  paymentMethod: 'FULL_PAYMENT',
  paymentLinkId: null,
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestIdempotencyKey = (overrides?: Partial<any>) => ({
  id: 'idem_' + Math.random().toString(36).substr(2, 9),
  key: 'idem_key_' + Math.random().toString(36).substr(2, 9),
  status: 'PROCESSING',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  ...overrides,
});

export const createTestTransaction = (overrides?: Partial<any>) => ({
  id: 'txn_' + Math.random().toString(36).substr(2, 9),
  orderId: 'order_' + Math.random().toString(36).substr(2, 9),
  code: 'TXN' + Date.now(),
  amount: 500000,
  status: 'SUCCESS',
  type: 'PAYMENT',
  paymentMethod: 'BANK_TRANSFER',
  createdAt: new Date(),
  ...overrides,
});

export const orderStatusTransitions = {
  validTransitions: {
    PENDING_PAYMENT: ['PAID', 'CANCELLED'],
    PARTIALLY_PAID: ['PAID', 'CANCELLED'],
    PAID: ['PROCESSING'],
    PROCESSING: ['SHIPPING'],
    SHIPPING: ['DELIVERED'],
    DELIVERED: ['PENDING_RETURN'],
    PENDING_RETURN: ['RETURNED', 'RETURN_REJECTED'],
    CANCELLED: [],
    RETURNED: [],
    RETURN_REJECTED: [],
  },
  invalidTransitions: [
    { from: 'DELIVERED', to: 'PENDING_PAYMENT' },
    { from: 'CANCELLED', to: 'PAID' },
    { from: 'PROCESSING', to: 'PENDING_PAYMENT' },
    { from: 'SHIPPED', to: 'PROCESSING' },
  ],
};

export const validOrderCreateData = {
  items: [
    {
      bookId: 'book_1',
      quantity: 1,
      coverOptionId: 'cover_1',
      paperOptionId: 'paper_1',
      sizeOptionId: 'size_1',
    },
  ],
  paymentMethod: 'FULL_PAYMENT',
  notes: '',
};

export const invalidOrderCreateDatasets = {
  emptyItems: { items: [], paymentMethod: 'FULL_PAYMENT' },
  nullItems: { items: null, paymentMethod: 'FULL_PAYMENT' },
  missingPaymentMethod: { items: [{ bookId: 'book_1', quantity: 1 }] },
  invalidPaymentMethod: { items: [{ bookId: 'book_1', quantity: 1 }], paymentMethod: 'INVALID' },
  itemWithMissingBookId: {
    items: [{ quantity: 1, coverOptionId: 'cover_1' }],
    paymentMethod: 'FULL_PAYMENT',
  },
  itemWithInvalidQuantity: {
    items: [{ bookId: 'book_1', quantity: 0 }],
    paymentMethod: 'FULL_PAYMENT',
  },
};

export const orderBoundaryValues = {
  minItems: 1,
  minItemsBoundary: 0,
  maxItems: 1000,
  maxItemsBoundary: 1001,
  minOrderAmount: 0,
  maxOrderAmount: 1000000000,
};

export const paymentWebhookTestCases = [
  {
    name: 'Full payment received',
    status: 'PAID',
    transactionAmount: 500000,
    orderAmount: 500000,
    expectedOrderStatus: 'PAID',
  },
  {
    name: 'Partial payment received',
    status: 'PAID',
    transactionAmount: 250000,
    orderAmount: 500000,
    expectedOrderStatus: 'PARTIALLY_PAID',
  },
  {
    name: 'Multiple partial payments sum to full',
    transactions: [
      { status: 'SUCCESS', amount: 250000 },
      { status: 'SUCCESS', amount: 250000 },
    ],
    orderAmount: 500000,
    expectedOrderStatus: 'PAID',
  },
  {
    name: 'Payment cancelled',
    status: 'CANCELLED',
    transactionAmount: 500000,
    orderAmount: 500000,
    expectedOrderStatus: 'CANCELLED',
  },
];

export const returnRequestTestData = {
  validReturnRequest: {
    reason: 'QUALITY_ISSUE',
    description: 'Pages are not aligned correctly',
    itemIds: ['item_1', 'item_2'],
  },
  invalidReturnRequest: {
    reason: 'INVALID_REASON',
    description: '',
    itemIds: [],
  },
};

export const orderReconciliationTestCases = [
  {
    name: 'Single supplier order',
    items: [
      { sampleBookId: 'sb_1', supplierId: 'sup_1', quantity: 5 },
    ],
    expectedSuppliers: ['sup_1'],
  },
  {
    name: 'Multiple suppliers order',
    items: [
      { sampleBookId: 'sb_1', supplierId: 'sup_1', quantity: 5 },
      { sampleBookId: 'sb_2', supplierId: 'sup_2', quantity: 3 },
    ],
    expectedSuppliers: ['sup_1', 'sup_2'],
  },
];
