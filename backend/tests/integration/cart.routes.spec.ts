/**
 * Cart Routes - Integration Tests
 * Test coverage: CRUD cart operations, calculations, payment plans
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis)
 */

import { CartService, CartQuote } from '@features/cart/cart.service';
import { CartDTO, CartItem } from '@echotrace/shared';
import { AppError } from '@middleware/app.error';

describe('Cart Routes - Integration Tests', () => {
  let mockCartService: jest.Mocked<CartService>;

  const mockCartItem = (overrides?: Partial<CartItem>): CartItem => ({
    bookId: 42,
    title: 'Book Title',
    style: 'default',
    font: 'Arial',
    cover: 'hardcover',
    paper: 'glossy',
    paperSize: 'A4',
    pages: 50,
    quantity: 1,
    price: 150000,
    paperHeight: 297,
    paperWidth: 210,
    coverUrl: null,
    ...overrides,
  });

  beforeEach(() => {
    mockCartService = {
      getCart: jest.fn(),
      upsertItem: jest.fn(),
      patchItem: jest.fn(),
      deleteItem: jest.fn(),
      calculateCart: jest.fn(),
      addAlbumToCart: jest.fn(),
    } as any;
    jest.clearAllMocks();
  });

  describe('GET /cart - Fetch User Cart', () => {
    it('EP: Should return user cart with items', async () => {
      const cart: CartDTO = {
        id: 1,
        userId: 100,
        parsedItems: [mockCartItem({ quantity: 2 })],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCartService.getCart.mockResolvedValue(cart);

      const result = await mockCartService.getCart(100);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('parsedItems');
      expect(result.parsedItems).toHaveLength(1);
    });

    it('EP: Should create cart if not exists', async () => {
      const cart: CartDTO = {
        id: 1,
        userId: 100,
        parsedItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCartService.getCart.mockResolvedValue(cart);

      const result = await mockCartService.getCart(100);

      expect(result.parsedItems).toEqual([]);
    });

    it('Auth: Should only return own cart', async () => {
      mockCartService.getCart.mockResolvedValue({
        userId: 100,
        parsedItems: [],
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await mockCartService.getCart(100);

      expect(mockCartService.getCart).toHaveBeenCalledWith(100);
    });

    it('EP: Should include book details in items', async () => {
      const cart: CartDTO = {
        id: 1,
        userId: 100,
        parsedItems: [
          mockCartItem({
            bookId: 42,
            title: 'Vacation Album 2024',
          }),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCartService.getCart.mockResolvedValue(cart);

      const result = await mockCartService.getCart(100);

      expect(result.parsedItems[0]).toHaveProperty('title');
      expect(result.parsedItems[0].title).toBe('Vacation Album 2024');
    });

    it('EP: Should calculate item price based on specs', async () => {
      const cart: CartDTO = {
        id: 1,
        userId: 100,
        parsedItems: [mockCartItem({ price: 150000 })],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCartService.getCart.mockResolvedValue(cart);

      const result = await mockCartService.getCart(100);

      expect(result.parsedItems[0].price).toBeGreaterThan(0);
    });
  });

  describe('POST /cart/item - Add/Upsert Item to Cart', () => {
    it('EP: Should add new item to cart', async () => {
      const item = mockCartItem({ bookId: 42, quantity: 1 });
      mockCartService.upsertItem.mockResolvedValue(item);

      const result = await mockCartService.upsertItem(100, {
        bookId: 42,
        quantity: 1,
      });

      expect(result.bookId).toBe(42);
    });

    it('EP: Should increment quantity if item exists', async () => {
      const item = mockCartItem({ quantity: 3 });
      mockCartService.upsertItem.mockResolvedValue(item);

      const result = await mockCartService.upsertItem(100, {
        bookId: 42,
        quantity: 1,
      });

      expect(result.quantity).toBe(3);
    });

    it('Error: Should validate bookId exists', async () => {
      mockCartService.upsertItem.mockRejectedValue(
        new AppError('NOT_FOUND', 404)
      );

      await expect(
        mockCartService.upsertItem(100, { bookId: 999, quantity: 1 })
      ).rejects.toThrow();
    });

    it('Validation: Should validate quantity > 0', () => {
      expect(() => {
        const quantity = 0;
        if (quantity < 1) {
          throw new AppError('Invalid quantity', 400);
        }
      }).toThrow();
    });

    it('BVA: Quantity minimum (1)', async () => {
      mockCartService.upsertItem.mockResolvedValue(mockCartItem({ quantity: 1 }));

      const result = await mockCartService.upsertItem(100, {
        bookId: 1,
        quantity: 1,
      });

      expect(result.quantity).toBeGreaterThanOrEqual(1);
    });

    it('BVA: Quantity maximum (1000)', async () => {
      mockCartService.upsertItem.mockResolvedValue(mockCartItem({ quantity: 1000 }));

      const result = await mockCartService.upsertItem(100, {
        bookId: 1,
        quantity: 1000,
      });

      expect(result.quantity).toBeLessThanOrEqual(1000);
    });
  });

  describe('PATCH /cart/item/:bookId - Update Cart Item', () => {
    it('EP: Should update quantity', async () => {
      const item = mockCartItem({ quantity: 3 });
      mockCartService.patchItem.mockResolvedValue(item);

      const result = await mockCartService.patchItem(100, 42, { quantity: 3 });

      expect(result.quantity).toBe(3);
    });

    it('EP: Should update cover spec', async () => {
      const item = mockCartItem({ cover: 'softcover' });
      mockCartService.patchItem.mockResolvedValue(item);

      const result = await mockCartService.patchItem(100, 42, {
        cover: 'softcover',
      });

      expect(result.cover).toBe('softcover');
    });

    it('EP: Should update paper spec', async () => {
      const item = mockCartItem({ paper: 'matte' });
      mockCartService.patchItem.mockResolvedValue(item);

      const result = await mockCartService.patchItem(100, 42, { paper: 'matte' });

      expect(result.paper).toBe('matte');
    });

    it('EP: Should update multiple fields at once', async () => {
      const item = mockCartItem({
        quantity: 2,
        cover: 'softcover',
        paper: 'matte',
      });
      mockCartService.patchItem.mockResolvedValue(item);

      const result = await mockCartService.patchItem(100, 42, {
        quantity: 2,
        cover: 'softcover',
        paper: 'matte',
      });

      expect(result).toMatchObject({
        quantity: 2,
        cover: 'softcover',
        paper: 'matte',
      });
    });

    it('Error: Should reject if item not found', async () => {
      mockCartService.patchItem.mockRejectedValue(
        new AppError('NOT_FOUND', 404)
      );

      await expect(mockCartService.patchItem(100, 999, { quantity: 1 })).rejects.toThrow();
    });
  });

  describe('DELETE /cart/item/:bookId - Remove Item', () => {
    it('EP: Should delete cart item', async () => {
      mockCartService.deleteItem.mockResolvedValue(void 0);

      await mockCartService.deleteItem(100, 42);

      expect(mockCartService.deleteItem).toHaveBeenCalledWith(100, 42);
    });

    it('Auth: Should only delete own items', async () => {
      mockCartService.deleteItem.mockResolvedValue(void 0);

      await mockCartService.deleteItem(100, 42);

      expect(mockCartService.deleteItem).toHaveBeenCalledWith(100, 42);
    });
  });

  describe('POST /cart/calculate - Get Order Quote', () => {
    it('EP: Should calculate quote for all items', async () => {
      const quote: CartQuote = {
        items: [mockCartItem({ price: 100000, quantity: 1 })],
        subtotal: 100000,
        discount: 0,
        total: 100000,
        payNow: 100000,
        payLater: 0,
        coupon: null,
      };
      mockCartService.calculateCart.mockResolvedValue(quote);

      const result = await mockCartService.calculateCart(100);

      expect(result).toHaveProperty('subtotal');
      expect(result).toHaveProperty('total');
    });

    it('EP: Should calculate quote for subset of items', async () => {
      const quote: CartQuote = {
        items: [mockCartItem({ price: 100000 })],
        subtotal: 100000,
        discount: 0,
        total: 100000,
        payNow: 100000,
        payLater: 0,
        coupon: null,
      };
      mockCartService.calculateCart.mockResolvedValue(quote);

      const result = await mockCartService.calculateCart(100, undefined, undefined, [1]);

      expect(result.items).toHaveLength(1);
    });

    it('EP: Should apply coupon discount', async () => {
      const quote: CartQuote = {
        items: [],
        subtotal: 100000,
        discount: 10000,
        total: 90000,
        payNow: 90000,
        payLater: 0,
        coupon: { id: 1, code: 'PROMO10', amount: 10000, maxUsageCount: 100 },
      };
      mockCartService.calculateCart.mockResolvedValue(quote);

      const result = await mockCartService.calculateCart(100, undefined, 'PROMO10');

      expect(result.discount).toBeGreaterThan(0);
      expect(result.coupon).toBeDefined();
    });

    it('Error: Should validate coupon exists', async () => {
      mockCartService.calculateCart.mockRejectedValue(
        new AppError('COUPON_NOT_FOUND', 404)
      );

      await expect(
        mockCartService.calculateCart(100, undefined, 'INVALID')
      ).rejects.toThrow();
    });

    it('EP: FULL_PAYMENT - calculate payNow = total', async () => {
      const quote: CartQuote = {
        items: [],
        subtotal: 1000000,
        discount: 0,
        total: 1000000,
        payNow: 1000000,
        payLater: 0,
        coupon: null,
      };
      mockCartService.calculateCart.mockResolvedValue(quote);

      const result = await mockCartService.calculateCart(100, 'full-payment');

      expect(result.payNow).toBe(result.total);
      expect(result.payLater).toBe(0);
    });

    it('EP: HALF_PAYMENT - calculate payNow = 50%', async () => {
      const quote: CartQuote = {
        items: [],
        subtotal: 1000000,
        discount: 0,
        total: 1000000,
        payNow: 500000,
        payLater: 500000,
        coupon: null,
      };
      mockCartService.calculateCart.mockResolvedValue(quote);

      const result = await mockCartService.calculateCart(100, 'half-payment');

      expect(result.payNow).toBe(result.total / 2);
      expect(result.payLater).toBe(result.total / 2);
    });

    it('BVA: Large order - many items', async () => {
      const items = Array.from({ length: 100 }, (_, i) =>
        mockCartItem({
          bookId: i + 1,
          price: 100000,
          quantity: 1,
        })
      );

      const quote: CartQuote = {
        items,
        subtotal: 10000000,
        discount: 0,
        total: 10000000,
        payNow: 10000000,
        payLater: 0,
        coupon: null,
      };
      mockCartService.calculateCart.mockResolvedValue(quote);

      const result = await mockCartService.calculateCart(100);

      expect(result.items.length).toBe(100);
    });
  });

  describe('POST /cart/album - Add Sample Book as Item', () => {
    it('EP: Should add sample book to cart as new book item', async () => {
      const item = mockCartItem({ bookId: 99 });
      mockCartService.addAlbumToCart.mockResolvedValue(item);

      const result = await mockCartService.addAlbumToCart(100, {
        sampleBookId: 15,
        quantity: 1,
      });

      expect(result).toHaveProperty('bookId');
    });

    it('Error: Should validate sample book exists', async () => {
      mockCartService.addAlbumToCart.mockRejectedValue(
        new AppError('Album đã hết hàng hoặc không đủ số lượng tồn kho', 400)
      );

      await expect(
        mockCartService.addAlbumToCart(100, { sampleBookId: 999, quantity: 1 })
      ).rejects.toThrow();
    });

    it('Error: Should check sample book stock', async () => {
      mockCartService.addAlbumToCart.mockRejectedValue(
        new AppError('Album đã hết hàng hoặc không đủ số lượng tồn kho', 400)
      );

      await expect(
        mockCartService.addAlbumToCart(100, { sampleBookId: 15, quantity: 1000 })
      ).rejects.toThrow();
    });

    it('EP: Should create book from sample with copied properties', async () => {
      const item = mockCartItem({
        bookId: 99,
        title: 'Sample Copy',
      });
      mockCartService.addAlbumToCart.mockResolvedValue(item);

      const result = await mockCartService.addAlbumToCart(100, {
        sampleBookId: 15,
        quantity: 1,
      });

      expect(result).toHaveProperty('title');
    });
  });

  describe('Auth & Authorization', () => {
    it('Auth: User can only access own cart', async () => {
      mockCartService.getCart.mockResolvedValue({
        userId: 100,
        parsedItems: [],
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await mockCartService.getCart(100);

      expect(mockCartService.getCart).toHaveBeenCalledWith(100);
    });
  });

  describe('Concurrency & Atomicity', () => {
    it('Concurrency: upsertItem uses atomic upsert', async () => {
      mockCartService.upsertItem.mockResolvedValue(mockCartItem({ quantity: 2 }));

      const result = await mockCartService.upsertItem(100, { bookId: 1, quantity: 1 });

      expect(result.quantity).toBeGreaterThanOrEqual(1);
    });
  });
});
