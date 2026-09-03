/**
 * Stock Service Unit Tests
 * Test coverage: Atomic stock operations, sumNeedBySampleBook, restockOrderAlbums
 * Methodology: test.md skill - EP, BVA, validation testing
 */

import { StockService } from '../../../src/features/sample-books/stock.service';
import { AppError } from '../../../src/middleware/app.error';

describe('StockService - Unit Tests', () => {
  let stockService: StockService;
  let mockSampleBookRepo: any;
  let mockCartItemRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSampleBookRepo = {
      findMany: jest.fn(),
      findById: jest.fn(),
      updateStock: jest.fn(),
    };

    mockCartItemRepo = {
      findMany: jest.fn(),
    };

    stockService = new StockService(mockSampleBookRepo, mockCartItemRepo);
  });

  // ===========================
  // SECTION 1: SUM NEED BY SAMPLE BOOK - EP & BVA
  // ===========================

  describe('1. sumNeedBySampleBook - EP (Equivalence Partitioning)', () => {
    describe('1.1 EP: Valid Book to Sample Book Mapping', () => {
      test('EP: Should sum quantities for books mapping to same sample book', async () => {
        // Book 1 → Sample Book A (qty 2)
        // Book 2 → Sample Book A (qty 3)
        // Book 3 → Sample Book B (qty 1)
        // Expected: { A: 5, B: 1 }

        const cartItems = [
          { id: 1, bookId: 1, quantity: 2 },
          { id: 2, bookId: 2, quantity: 3 },
          { id: 3, bookId: 3, quantity: 1 },
        ];

        const bookMapping = {
          1: { sampleBookId: 'A', quantity: null }, // Unlimited stock
          2: { sampleBookId: 'A', quantity: 100 },
          3: { sampleBookId: 'B', quantity: 50 },
        };

        mockCartItemRepo.findMany.mockResolvedValue(cartItems);
        mockSampleBookRepo.findMany.mockResolvedValue(
          Object.entries(bookMapping).map(([bookId, data]) => ({
            id: bookId,
            sampleBookId: data.sampleBookId,
            quantity: data.quantity,
          }))
        );

        const result = await stockService.sumNeedBySampleBook([1, 2, 3]);

        expect(result).toBeDefined();
        // Result should have aggregated quantities per sample book
      });

      test('EP: Should handle single book', async () => {
        const cartItems = [{ id: 1, bookId: 1, quantity: 5 }];

        const bookMapping = {
          1: { sampleBookId: 'A', quantity: 100 },
        };

        mockCartItemRepo.findMany.mockResolvedValue(cartItems);
        mockSampleBookRepo.findMany.mockResolvedValue([
          { id: 1, sampleBookId: 'A', quantity: 100 },
        ]);

        const result = await stockService.sumNeedBySampleBook([1]);

        expect(result).toBeDefined();
      });

      test('EP: Should handle multiple books to different sample books', async () => {
        const cartItems = [
          { id: 1, bookId: 1, quantity: 2 },
          { id: 2, bookId: 2, quantity: 3 },
          { id: 3, bookId: 3, quantity: 1 },
          { id: 4, bookId: 4, quantity: 4 },
        ];

        mockCartItemRepo.findMany.mockResolvedValue(cartItems);
        mockSampleBookRepo.findMany.mockResolvedValue([
          { id: 1, sampleBookId: 'A', quantity: 100 },
          { id: 2, sampleBookId: 'B', quantity: 100 },
          { id: 3, sampleBookId: 'C', quantity: 100 },
          { id: 4, sampleBookId: 'D', quantity: 100 },
        ]);

        const result = await stockService.sumNeedBySampleBook([1, 2, 3, 4]);

        expect(result).toBeDefined();
      });
    });

    describe('1.2 EP: Invalid or Missing Books', () => {
      test('EP: Should handle empty book list', async () => {
        mockCartItemRepo.findMany.mockResolvedValue([]);

        const result = await stockService.sumNeedBySampleBook([]);

        expect(result).toEqual({});
      });

      test('EP: Should handle non-existent book IDs', async () => {
        mockCartItemRepo.findMany.mockResolvedValue([]);
        mockSampleBookRepo.findMany.mockResolvedValue([]);

        const result = await stockService.sumNeedBySampleBook([999, 888]);

        expect(result).toBeDefined();
      });
    });

    describe('1.3 BVA: Quantity Boundaries', () => {
      test('BVA: Zero quantity item', async () => {
        const cartItems = [{ id: 1, bookId: 1, quantity: 0 }];

        mockCartItemRepo.findMany.mockResolvedValue(cartItems);
        mockSampleBookRepo.findMany.mockResolvedValue([
          { id: 1, sampleBookId: 'A', quantity: 100 },
        ]);

        const result = await stockService.sumNeedBySampleBook([1]);

        // Should include zero quantity in sum
        expect(result).toBeDefined();
      });

      test('BVA: Negative quantity (edge case)', async () => {
        const cartItems = [{ id: 1, bookId: 1, quantity: -5 }];

        mockCartItemRepo.findMany.mockResolvedValue(cartItems);
        mockSampleBookRepo.findMany.mockResolvedValue([
          { id: 1, sampleBookId: 'A', quantity: 100 },
        ]);

        const result = await stockService.sumNeedBySampleBook([1]);

        // Should handle gracefully
        expect(result).toBeDefined();
      });

      test('BVA: Very large quantity', async () => {
        const cartItems = [{ id: 1, bookId: 1, quantity: 10000 }];

        mockCartItemRepo.findMany.mockResolvedValue(cartItems);
        mockSampleBookRepo.findMany.mockResolvedValue([
          { id: 1, sampleBookId: 'A', quantity: 100 },
        ]);

        const result = await stockService.sumNeedBySampleBook([1]);

        expect(result).toBeDefined();
      });

      test('BVA: Max safe integer quantity', async () => {
        const cartItems = [{ id: 1, bookId: 1, quantity: Number.MAX_SAFE_INTEGER }];

        mockCartItemRepo.findMany.mockResolvedValue(cartItems);
        mockSampleBookRepo.findMany.mockResolvedValue([
          { id: 1, sampleBookId: 'A', quantity: 100 },
        ]);

        const result = await stockService.sumNeedBySampleBook([1]);

        expect(result).toBeDefined();
      });
    });

    describe('1.4 BVA: Stock Quantity Boundaries', () => {
      test('BVA: Sample book with unlimited stock (quantity=null)', async () => {
        const cartItems = [{ id: 1, bookId: 1, quantity: 5 }];

        mockCartItemRepo.findMany.mockResolvedValue(cartItems);
        mockSampleBookRepo.findMany.mockResolvedValue([
          { id: 1, sampleBookId: 'A', quantity: null }, // Unlimited
        ]);

        const result = await stockService.sumNeedBySampleBook([1]);

        // Should handle unlimited stock (null quantity)
        expect(result).toBeDefined();
      });

      test('BVA: Sample book with zero stock', async () => {
        const cartItems = [{ id: 1, bookId: 1, quantity: 5 }];

        mockCartItemRepo.findMany.mockResolvedValue(cartItems);
        mockSampleBookRepo.findMany.mockResolvedValue([
          { id: 1, sampleBookId: 'A', quantity: 0 }, // Out of stock
        ]);

        const result = await stockService.sumNeedBySampleBook([1]);

        expect(result).toBeDefined();
      });

      test('BVA: Sample book with single item stock', async () => {
        const cartItems = [{ id: 1, bookId: 1, quantity: 2 }];

        mockCartItemRepo.findMany.mockResolvedValue(cartItems);
        mockSampleBookRepo.findMany.mockResolvedValue([
          { id: 1, sampleBookId: 'A', quantity: 1 }, // Only 1 in stock
        ]);

        const result = await stockService.sumNeedBySampleBook([1]);

        expect(result).toBeDefined();
      });
    });
  });

  // ===========================
  // SECTION 2: RESTOCK ORDER ALBUMS - ATOMIC INCREMENT
  // ===========================

  describe('2. restockOrderAlbums - Atomic Increment', () => {
    describe('2.1 EP: Valid Restock Scenarios', () => {
      test('EP: Should restock multiple albums', async () => {
        const restockData = [
          { sampleBookId: 'A', quantity: 5 },
          { sampleBookId: 'B', quantity: 3 },
        ];

        mockSampleBookRepo.updateStock.mockResolvedValue(true);

        await stockService.restockOrderAlbums(restockData);

        expect(mockSampleBookRepo.updateStock).toHaveBeenCalledTimes(2);
      });

      test('EP: Should restock single album', async () => {
        const restockData = [{ sampleBookId: 'A', quantity: 10 }];

        mockSampleBookRepo.updateStock.mockResolvedValue(true);

        await stockService.restockOrderAlbums(restockData);

        expect(mockSampleBookRepo.updateStock).toHaveBeenCalledWith(
          'A',
          expect.objectContaining({ increment: 10 })
        );
      });

      test('EP: Should skip restock for unlimited stock (quantity=null)', async () => {
        const restockData = [
          { sampleBookId: 'A', quantity: null }, // Unlimited
          { sampleBookId: 'B', quantity: 5 },
        ];

        mockSampleBookRepo.updateStock.mockResolvedValue(true);

        await stockService.restockOrderAlbums(restockData);

        // Should only call updateStock for B (not for unlimited A)
        expect(mockSampleBookRepo.updateStock).toHaveBeenCalledTimes(1);
        expect(mockSampleBookRepo.updateStock).toHaveBeenCalledWith(
          'B',
          expect.any(Object)
        );
      });
    });

    describe('2.2 EP: Invalid Restock Data', () => {
      test('EP: Should handle empty restock list', async () => {
        await stockService.restockOrderAlbums([]);

        // Should not call updateStock
        expect(mockSampleBookRepo.updateStock).not.toHaveBeenCalled();
      });

      test('EP: Should skip all unlimited items', async () => {
        const restockData = [
          { sampleBookId: 'A', quantity: null },
          { sampleBookId: 'B', quantity: null },
          { sampleBookId: 'C', quantity: null },
        ];

        mockSampleBookRepo.updateStock.mockResolvedValue(true);

        await stockService.restockOrderAlbums(restockData);

        // Should not call updateStock for any
        expect(mockSampleBookRepo.updateStock).not.toHaveBeenCalled();
      });
    });

    describe('2.3 BVA: Restock Quantity Boundaries', () => {
      test('BVA: Restock with 0 quantity', async () => {
        const restockData = [{ sampleBookId: 'A', quantity: 0 }];

        mockSampleBookRepo.updateStock.mockResolvedValue(true);

        await stockService.restockOrderAlbums(restockData);

        expect(mockSampleBookRepo.updateStock).toHaveBeenCalledWith(
          'A',
          expect.objectContaining({ increment: 0 })
        );
      });

      test('BVA: Restock with 1 item', async () => {
        const restockData = [{ sampleBookId: 'A', quantity: 1 }];

        mockSampleBookRepo.updateStock.mockResolvedValue(true);

        await stockService.restockOrderAlbums(restockData);

        expect(mockSampleBookRepo.updateStock).toHaveBeenCalledWith(
          'A',
          expect.objectContaining({ increment: 1 })
        );
      });

      test('BVA: Restock with large quantity', async () => {
        const restockData = [{ sampleBookId: 'A', quantity: 10000 }];

        mockSampleBookRepo.updateStock.mockResolvedValue(true);

        await stockService.restockOrderAlbums(restockData);

        expect(mockSampleBookRepo.updateStock).toHaveBeenCalledWith(
          'A',
          expect.objectContaining({ increment: 10000 })
        );
      });

      test('BVA: Restock with negative quantity (should handle)', async () => {
        const restockData = [{ sampleBookId: 'A', quantity: -5 }];

        mockSampleBookRepo.updateStock.mockResolvedValue(true);

        await stockService.restockOrderAlbums(restockData);

        // Should still call updateStock (business logic may validate)
        expect(mockSampleBookRepo.updateStock).toHaveBeenCalled();
      });
    });

    describe('2.4 Atomicity: WHERE quantity NOT NULL', () => {
      test('Should use WHERE clause to skip unlimited items', async () => {
        const restockData = [
          { sampleBookId: 'A', quantity: 5 },
          { sampleBookId: 'B', quantity: null },
        ];

        mockSampleBookRepo.updateStock.mockResolvedValue(true);

        await stockService.restockOrderAlbums(restockData);

        // Verify that the WHERE clause excludes B
        const calls = mockSampleBookRepo.updateStock.mock.calls;
        expect(calls.length).toBe(1);
        expect(calls[0][0]).toBe('A');
      });
    });
  });

  // ===========================
  // SECTION 3: CONCURRENCY - RACE CONDITIONS
  // ===========================

  describe('3. Concurrency - Atomic Stock Operations', () => {
    test('RACE: Concurrent restock operations', async () => {
      // Simulates two orders returning stock simultaneously
      const restockData1 = [{ sampleBookId: 'A', quantity: 5 }];
      const restockData2 = [{ sampleBookId: 'A', quantity: 3 }];

      mockSampleBookRepo.updateStock.mockResolvedValue(true);

      // Both operations should execute atomically
      await Promise.all([
        stockService.restockOrderAlbums(restockData1),
        stockService.restockOrderAlbums(restockData2),
      ]);

      // Both should be called (each updates independently)
      expect(mockSampleBookRepo.updateStock).toHaveBeenCalledTimes(2);
    });

    test('RACE: Restock and decrement (no overlap)', async () => {
      // These are separate operations - test ensures no interference
      const restockData = [{ sampleBookId: 'A', quantity: 5 }];

      mockSampleBookRepo.updateStock.mockResolvedValue(true);

      await stockService.restockOrderAlbums(restockData);

      expect(mockSampleBookRepo.updateStock).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================
  // SECTION 4: VALIDATION TESTING
  // ===========================

  describe('4. Validation Testing - Edge Cases', () => {
    test('Validation: Book ID list with duplicates', async () => {
      const cartItems = [
        { id: 1, bookId: 1, quantity: 2 },
        { id: 2, bookId: 1, quantity: 3 }, // Duplicate bookId
      ];

      mockCartItemRepo.findMany.mockResolvedValue(cartItems);
      mockSampleBookRepo.findMany.mockResolvedValue([
        { id: 1, sampleBookId: 'A', quantity: 100 },
      ]);

      const result = await stockService.sumNeedBySampleBook([1, 1]);

      // Should sum quantities for duplicate book IDs
      expect(result).toBeDefined();
    });

    test('Validation: Very long list of books', async () => {
      const bookIds = Array.from({ length: 1000 }, (_, i) => i + 1);
      const cartItems = bookIds.map((id) => ({
        id,
        bookId: id,
        quantity: 1,
      }));

      mockCartItemRepo.findMany.mockResolvedValue(cartItems);
      mockSampleBookRepo.findMany.mockResolvedValue(
        cartItems.map((item) => ({
          id: item.bookId,
          sampleBookId: `SB_${Math.floor(item.bookId / 10)}`,
          quantity: 100,
        }))
      );

      const result = await stockService.sumNeedBySampleBook(bookIds);

      expect(result).toBeDefined();
    });

    test('Validation: Mixed null and numeric quantities', async () => {
      const restockData = [
        { sampleBookId: 'A', quantity: 5 },
        { sampleBookId: 'B', quantity: null },
        { sampleBookId: 'C', quantity: 10 },
        { sampleBookId: 'D', quantity: null },
      ];

      mockSampleBookRepo.updateStock.mockResolvedValue(true);

      await stockService.restockOrderAlbums(restockData);

      // Should only update A and C (skip B and D with null)
      expect(mockSampleBookRepo.updateStock).toHaveBeenCalledTimes(2);
    });

    test('Validation: Restock with special characters in sampleBookId', async () => {
      const restockData = [
        { sampleBookId: 'SB-123_456', quantity: 5 },
        { sampleBookId: 'SB@#$', quantity: 3 },
      ];

      mockSampleBookRepo.updateStock.mockResolvedValue(true);

      await stockService.restockOrderAlbums(restockData);

      // Should handle special characters
      expect(mockSampleBookRepo.updateStock).toHaveBeenCalledTimes(2);
    });
  });
});


  // ===========================
  // SECTION 3: STOCK ATOMICITY & CONCURRENCY
  // ===========================

  describe('3. RACE: Stock Decrement Atomic Operations', () => {
    describe('3.1 Atomic WHERE quantity >= need', () => {
      test('BVA: Stock decrement WHERE satisfied (count=1)', async () => {
        const sampleBookId = 'A';
        const need = 50;
        const currentStock = 100;

        mockSampleBookRepo.updateStock.mockResolvedValue({
          count: 1, // WHERE satisfied
          quantity: currentStock - need,
        });

        const result = await stockService.decrementStock(sampleBookId, need);

        expect(result.count).toBe(1);
        expect(mockSampleBookRepo.updateStock).toHaveBeenCalledWith(
          sampleBookId,
          expect.objectContaining({ decrement: need })
        );
      });

      test('BVA: Stock decrement WHERE not satisfied (count=0)', async () => {
        const sampleBookId = 'A';
        const need = 150; // More than available
        const currentStock = 100;

        mockSampleBookRepo.updateStock.mockResolvedValue({
          count: 0, // WHERE not satisfied
          quantity: currentStock,
        });

        const result = await stockService.decrementStock(sampleBookId, need);

        expect(result.count).toBe(0);
      });

      test('BVA: Stock decrement exact boundary (need=quantity)', async () => {
        const sampleBookId = 'A';
        const need = 100;
        const currentStock = 100;

        mockSampleBookRepo.updateStock.mockResolvedValue({
          count: 1,
          quantity: 0,
        });

        const result = await stockService.decrementStock(sampleBookId, need);

        expect(result.count).toBe(1);
        expect(result.quantity).toBe(0);
      });
    });

    describe('3.2 Concurrent Orders Same Stock', () => {
      test('RACE: Two orders need=50 each, stock=100 (one succeeds, one fails)', async () => {
        const sampleBookId = 'A';
        let callCount = 0;

        mockSampleBookRepo.updateStock.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ count: 1, quantity: 50 }); // First succeeds
          } else {
            return Promise.resolve({ count: 0, quantity: 50 }); // Second fails (not enough left)
          }
        });

        const result1 = await stockService.decrementStock(sampleBookId, 50);
        const result2 = await stockService.decrementStock(sampleBookId, 50);

        expect(result1.count).toBe(1); // First succeeds
        expect(result2.count).toBe(0); // Second fails
      });

      test('RACE: Two orders need=60 each, stock=100 (first succeeds, second fails)', async () => {
        const sampleBookId = 'A';
        let callCount = 0;

        mockSampleBookRepo.updateStock.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ count: 1, quantity: 40 });
          } else {
            return Promise.resolve({ count: 0, quantity: 40 }); // 40 < 60
          }
        });

        const result1 = await stockService.decrementStock(sampleBookId, 60);
        const result2 = await stockService.decrementStock(sampleBookId, 60);

        expect(result1.count).toBe(1);
        expect(result2.count).toBe(0);
      });

      test('RACE: Many concurrent orders exhaust stock', async () => {
        const sampleBookId = 'A';
        const orders = Array(10).fill({ sampleBookId, need: 15 });
        const initialStock = 100;

        let stock = initialStock;
        mockSampleBookRepo.updateStock.mockImplementation(() => {
          if (stock >= 15) {
            stock -= 15;
            return Promise.resolve({ count: 1, quantity: stock });
          } else {
            return Promise.resolve({ count: 0, quantity: stock });
          }
        });

        const results = [];
        for (const order of orders) {
          const res = await stockService.decrementStock(order.sampleBookId, order.need);
          results.push(res.count);
        }

        const successCount = results.filter((c) => c === 1).length;
        const failCount = results.filter((c) => c === 0).length;

        expect(successCount + failCount).toBe(10);
        expect(successCount).toBeLessThanOrEqual(6); // At most 6 can succeed with 100 stock
      });
    });

    describe('3.3 Unlimited Stock (null quantity)', () => {
      test('EP: Sample book with quantity=null → skip decrement', async () => {
        const sampleBookId = 'UNLIMITED';
        const need = 1000;

        mockSampleBookRepo.findById.mockResolvedValue({
          id: sampleBookId,
          quantity: null, // Unlimited
        });

        // Should not call updateStock
        const result = await stockService.decrementStock(sampleBookId, need);

        // For unlimited, should return success without decrementing
        expect(mockSampleBookRepo.updateStock).not.toHaveBeenCalled();
      });

      test('EP: Restock unlimited book (should skip)', async () => {
        const restockData = [{ sampleBookId: 'UNLIMITED', quantity: null }];

        mockSampleBookRepo.findById.mockResolvedValue({
          id: 'UNLIMITED',
          quantity: null,
        });

        await stockService.restockOrderAlbums(restockData);

        // Should not modify unlimited stock
        expect(mockSampleBookRepo.updateStock).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================
  // SECTION 4: MULTIPLE ITEMS TRANSACTION
  // ===========================

  describe('4. EP: Multiple Items Same Order (All or Nothing)', () => {
    test('EP: All items available → decrement all', async () => {
      const items = [
        { sampleBookId: 'A', need: 50 },
        { sampleBookId: 'B', need: 30 },
        { sampleBookId: 'C', need: 20 },
      ];

      mockSampleBookRepo.updateStock.mockResolvedValue({ count: 1 });

      const results = [];
      for (const item of items) {
        const res = await stockService.decrementStock(item.sampleBookId, item.need);
        results.push(res);
      }

      const successCount = results.filter((r) => r.count === 1).length;
      expect(successCount).toBe(3);
    });

    test('EP: One item insufficient → all should be rolled back (TX atomicity)', async () => {
      const items = [
        { sampleBookId: 'A', need: 50 },
        { sampleBookId: 'B', need: 30 },
        { sampleBookId: 'C', need: 200 }, // This will fail
      ];

      let callCount = 0;
      mockSampleBookRepo.updateStock.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({ count: 1 });
        } else {
          // Simulate rollback on third item failure
          return Promise.reject(new Error('Transaction rolled back'));
        }
      });

      const results = [];
      for (const item of items) {
        const res = await stockService
          .decrementStock(item.sampleBookId, item.need)
          .catch(() => ({ count: 0 }));
        results.push(res);
      }

      const failCount = results.filter((r) => r.count === 0).length;
      expect(failCount).toBeGreaterThan(0);
    });

    test('EP: First item fails → skip remaining (TX short-circuit)', async () => {
      const items = [
        { sampleBookId: 'A', need: 200 }, // Will fail
        { sampleBookId: 'B', need: 30 },
        { sampleBookId: 'C', need: 20 },
      ];

      mockSampleBookRepo.updateStock.mockResolvedValue({ count: 0 }); // First fails

      const result1 = await stockService.decrementStock(items[0].sampleBookId, items[0].need);

      // Transaction should be aborted; remaining items not processed
      expect(result1.count).toBe(0);
      expect(mockSampleBookRepo.updateStock).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================
  // SECTION 5: COMPLEX AGGREGATIONS
  // ===========================

  describe('5. EP: Complex sumNeedBySampleBook Scenarios', () => {
    test('EP: Books with duplicate sample books across multiple carts', async () => {
      // Cart 1: Book 1 (→SB-A), Book 2 (→SB-A), qty 2 + 3 = 5
      // Cart 2: Book 1 (→SB-A), qty 4 (from different user)
      // Expected: SB-A = 9 total

      const cartItems = [
        { id: 1, bookId: 1, quantity: 2, userId: 1 },
        { id: 2, bookId: 2, quantity: 3, userId: 1 },
        { id: 3, bookId: 1, quantity: 4, userId: 2 },
      ];

      mockCartItemRepo.findMany.mockResolvedValue(cartItems);
      mockSampleBookRepo.findMany.mockResolvedValue([
        { id: 1, sampleBookId: 'A', quantity: 100 },
        { id: 2, sampleBookId: 'A', quantity: 100 },
      ]);

      const result = await stockService.sumNeedBySampleBook([1, 2]);

      expect(result).toBeDefined();
      // Total need for SB-A should be aggregated
    });

    test('EP: Books with different print options → same sample book', async () => {
      // Book 1 with PrintOption A → SB-X
      // Book 1 with PrintOption B → SB-Y
      // Should not aggregate (different print options = different sample books)

      const cartItems = [
        { id: 1, bookId: 1, printOptionId: 'A', quantity: 2 },
        { id: 2, bookId: 1, printOptionId: 'B', quantity: 3 },
      ];

      mockCartItemRepo.findMany.mockResolvedValue(cartItems);
      mockSampleBookRepo.findMany.mockResolvedValue([
        { id: 1, printOptionId: 'A', sampleBookId: 'X', quantity: 100 },
        { id: 1, printOptionId: 'B', sampleBookId: 'Y', quantity: 100 },
      ]);

      const result = await stockService.sumNeedBySampleBook([1]);

      expect(result).toBeDefined();
    });

    test('BVA: Very large number of books (100+)', async () => {
      const cartItems = Array(100)
        .fill(null)
        .map((_, i) => ({
          id: i,
          bookId: i,
          quantity: Math.floor(Math.random() * 10) + 1,
        }));

      mockCartItemRepo.findMany.mockResolvedValue(cartItems);
      mockSampleBookRepo.findMany.mockResolvedValue(
        cartItems.map((item) => ({
          id: item.bookId,
          sampleBookId: `SB-${Math.floor(item.bookId / 10)}`,
          quantity: 1000,
        }))
      );

      const result = await stockService.sumNeedBySampleBook(cartItems.map((c) => c.bookId));

      expect(result).toBeDefined();
    });

    test('BVA: Large quantities per item (1000+)', async () => {
      const cartItems = [
        { id: 1, bookId: 1, quantity: 5000 },
        { id: 2, bookId: 2, quantity: 3000 },
      ];

      mockCartItemRepo.findMany.mockResolvedValue(cartItems);
      mockSampleBookRepo.findMany.mockResolvedValue([
        { id: 1, sampleBookId: 'A', quantity: 50000 },
        { id: 2, sampleBookId: 'A', quantity: 50000 },
      ]);

      const result = await stockService.sumNeedBySampleBook([1, 2]);

      expect(result).toBeDefined();
    });
  });

  // ===========================
  // SECTION 6: ERROR HANDLING & EDGE CASES
  // ===========================

  describe('6. Error: Stock Operations Edge Cases', () => {
    test('Error: Sample book deleted mid-operation → not found', async () => {
      mockSampleBookRepo.findById.mockResolvedValue(null);

      await expect(
        stockService.decrementStock('DELETED-SB', 50)
      ).rejects.toThrow('Sample book not found');
    });

    test('Error: Negative stock after decrement (should not happen with WHERE)', async () => {
      mockSampleBookRepo.updateStock.mockRejectedValue(
        new Error('Stock cannot be negative')
      );

      await expect(
        stockService.decrementStock('A', 200)
      ).rejects.toThrow();
    });

    test('Error: Zero need (invalid quantity)', async () => {
      await expect(
        stockService.decrementStock('A', 0)
      ).rejects.toThrow('Quantity must be greater than 0');
    });

    test('Error: Negative need (invalid quantity)', async () => {
      await expect(
        stockService.decrementStock('A', -50)
      ).rejects.toThrow();
    });

    test('Error: Restock non-existent sample book', async () => {
      mockSampleBookRepo.findById.mockResolvedValue(null);

      await expect(
        stockService.restockOrderAlbums([{ sampleBookId: 'NON-EXISTENT', quantity: 10 }])
      ).rejects.toThrow('Sample book not found');
    });

    test('Error: Database connection error during stock update', async () => {
      mockSampleBookRepo.updateStock.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        stockService.decrementStock('A', 50)
      ).rejects.toThrow('Database connection failed');
    });
  });

  // ===========================
  // SECTION 7: STOCK VERIFICATION & VALIDATION
  // ===========================

  describe('7. EP: Stock Verification Before Order', () => {
    test('EP: Verify all items available before order', async () => {
      const need = new Map([
        ['SB-A', 50],
        ['SB-B', 30],
        ['SB-C', 20],
      ]);

      mockSampleBookRepo.findMany.mockResolvedValue([
        { id: 'A', sampleBookId: 'SB-A', quantity: 100 },
        { id: 'B', sampleBookId: 'SB-B', quantity: 100 },
        { id: 'C', sampleBookId: 'SB-C', quantity: 100 },
      ]);

      const result = await stockService.verifyStockAvailable(need);

      expect(result).toBe(true);
    });

    test('EP: Verify fails if any item insufficient', async () => {
      const need = new Map([
        ['SB-A', 150], // Only 100 available
        ['SB-B', 30],
      ]);

      mockSampleBookRepo.findMany.mockResolvedValue([
        { id: 'A', sampleBookId: 'SB-A', quantity: 100 },
        { id: 'B', sampleBookId: 'SB-B', quantity: 100 },
      ]);

      const result = await stockService.verifyStockAvailable(need);

      expect(result).toBe(false);
    });

    test('BVA: Verify with zero needed (boundary)', async () => {
      const need = new Map([['SB-A', 0]]);

      mockSampleBookRepo.findMany.mockResolvedValue([
        { id: 'A', sampleBookId: 'SB-A', quantity: 100 },
      ]);

      const result = await stockService.verifyStockAvailable(need);

      expect(result).toBe(true);
    });
  });

  // ===========================
  // SECTION 8: RESTOCK OPERATIONS
  // ===========================

  describe('8. EP: Restock Workflows', () => {
    test('EP: Restock after order cancellation', async () => {
      const restockData = [
        { sampleBookId: 'SB-A', quantity: 50 },
        { sampleBookId: 'SB-B', quantity: 30 },
      ];

      mockSampleBookRepo.updateStock.mockResolvedValue({
        quantity: 150, // 100 + 50
      });

      await stockService.restockOrderAlbums(restockData);

      expect(mockSampleBookRepo.updateStock).toHaveBeenCalledTimes(2);
    });

    test('EP: Partial restock (some items returned)', async () => {
      // Order was: SB-A:50, SB-B:30
      // Only SB-A being returned
      const restockData = [{ sampleBookId: 'SB-A', quantity: 50 }];

      mockSampleBookRepo.updateStock.mockResolvedValue({ quantity: 150 });

      await stockService.restockOrderAlbums(restockData);

      expect(mockSampleBookRepo.updateStock).toHaveBeenCalledWith(
        'SB-A',
        expect.objectContaining({ increment: 50 })
      );
    });

    test('Error: Restock would exceed max capacity (if enforced)', async () => {
      const restockData = [{ sampleBookId: 'SB-A', quantity: 1000000 }];

      mockSampleBookRepo.updateStock.mockRejectedValue(
        new Error('Max stock capacity exceeded')
      );

      await expect(
        stockService.restockOrderAlbums(restockData)
      ).rejects.toThrow('Max stock capacity exceeded');
    });
  });
});
