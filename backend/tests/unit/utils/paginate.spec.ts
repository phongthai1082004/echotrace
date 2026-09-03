/**
 * Paginate Utility Unit Tests
 * Test coverage: Cursor-based pagination with soft-delete filtering and boundary analysis
 * Methodology: test.md skill - EP, BVA for pagination cursor logic
 */

import { paginate } from '../../../src/utils/paginate';

describe('Paginate Utility - Cursor Pagination Tests', () => {
  let mockDelegate: any;

  beforeEach(() => {
    mockDelegate = {
      findMany: jest.fn(),
    };
  });

  // ===========================
  // SECTION 1: EQUIVALENCE PARTITIONING - BASIC PAGINATION
  // ===========================

  describe('1. EP: Basic Pagination Scenarios', () => {
    describe('1.1 EP: Valid Partition - Results Return Successfully', () => {
      test('EP: Should return items when results less than limit', async () => {
        const mockItems = [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ];

        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 10, cursor: null });

        expect(result.items).toEqual(mockItems);
        expect(result.nextCursor).toBeNull(); // No next cursor when items < limit
      });

      test('EP: Should include soft-delete filter (isDelete: false)', async () => {
        const mockItems = [];
        mockDelegate.findMany.mockResolvedValue(mockItems);

        await paginate(mockDelegate, { limit: 10, cursor: null });

        // Verify that isDelete: false is included in the query
        const callArgs = mockDelegate.findMany.mock.calls[0][0];
        expect(callArgs.where.isDelete).toBe(false);
      });

      test('EP: Should merge extra where conditions', async () => {
        const mockItems = [];
        mockDelegate.findMany.mockResolvedValue(mockItems);

        const extraWhere = { userId: 123, status: 'ACTIVE' };
        await paginate(mockDelegate, { limit: 10, cursor: null }, {}, extraWhere);

        const callArgs = mockDelegate.findMany.mock.calls[0][0];
        expect(callArgs.where.userId).toBe(123);
        expect(callArgs.where.status).toBe('ACTIVE');
        expect(callArgs.where.isDelete).toBe(false);
      });
    });

    describe('1.2 EP: Invalid Partition - Empty Results', () => {
      test('EP: Should handle empty result set', async () => {
        mockDelegate.findMany.mockResolvedValue([]);

        const result = await paginate(mockDelegate, { limit: 10, cursor: null });

        expect(result.items).toEqual([]);
        expect(result.nextCursor).toBeNull();
      });

      test('EP: Should handle null cursor (first page)', async () => {
        const mockItems = [{ id: 1, name: 'Item' }];
        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 10, cursor: null });

        expect(result.items).toHaveLength(1);
        expect(result.nextCursor).toBeNull(); // Less than limit
      });
    });
  });

  // ===========================
  // SECTION 2: BOUNDARY VALUE ANALYSIS - CURSOR LOGIC
  // ===========================

  describe('2. BVA: Cursor Boundaries and Pagination', () => {
    describe('2.1 BVA: Limit Boundaries', () => {
      test('BVA: Limit = 1 (minimum)', async () => {
        const mockItems = [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' }, // Extra item to trigger nextCursor
        ];

        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 1, cursor: null });

        expect(result.items).toHaveLength(2); // Query returns 2 even though limit is 1
        expect(result.nextCursor).toBe(2); // ID of last item
      });

      test('BVA: Limit = 10 (standard)', async () => {
        const mockItems = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 10, cursor: null });

        expect(result.items).toHaveLength(10);
        expect(result.nextCursor).toBeNull(); // Exactly limit items
      });

      test('BVA: Limit = 10, results = limit + 1 (should detect next page exists)', async () => {
        const mockItems = Array.from({ length: 11 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 10, cursor: null });

        expect(result.items).toHaveLength(11);
        expect(result.nextCursor).toBe(11); // Last item's ID
      });

      test('BVA: Limit = 100 (large)', async () => {
        const mockItems = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 100, cursor: null });

        expect(result.items).toHaveLength(100);
        expect(result.nextCursor).toBeNull(); // Exactly limit
      });

      test('BVA: Limit = 100, results = 101 (should set nextCursor)', async () => {
        const mockItems = Array.from({ length: 101 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 100, cursor: null });

        expect(result.nextCursor).toBe(101);
      });
    });

    describe('2.2 BVA: Cursor Position Boundaries', () => {
      test('BVA: Cursor = null (first page)', async () => {
        const mockItems = [{ id: 1, name: 'Item 1' }];
        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 10, cursor: null });

        expect(result.items[0].id).toBe(1);
      });

      test('BVA: Cursor = 1 (second page starting after id 1)', async () => {
        const mockItems = [
          { id: 2, name: 'Item 2' },
          { id: 3, name: 'Item 3' },
        ];
        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 10, cursor: 1 });

        expect(result.items[0].id).toBe(2);
      });

      test('BVA: Cursor = very large ID (e.g., 999999)', async () => {
        const mockItems = [];
        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 10, cursor: 999999 });

        expect(result.items).toEqual([]);
        expect(result.nextCursor).toBeNull();
      });
    });

    describe('2.3 BVA: NextCursor Logic Edge Cases', () => {
      test('BVA: Last item without ID (should use null as nextCursor)', async () => {
        const mockItems = [{ id: 1, name: 'Item 1' }, { id: 2 }]; // Last item has no id field
        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 1, cursor: null });

        // Mock returns 2 items, but if last item has null/undefined id
        const lastItemId = mockItems[mockItems.length - 1]?.id;
        expect(result.nextCursor).toBe(lastItemId ?? null);
      });

      test('BVA: All items have null ID', async () => {
        const mockItems = [{ name: 'Item 1' }, { name: 'Item 2' }];
        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 1, cursor: null });

        expect(result.nextCursor).toBeNull(); // Last item has no id
      });

      test('BVA: Should use last item ID regardless of position', async () => {
        const mockItems = Array.from({ length: 11 }, (_, i) => ({ id: i + 100, name: `Item ${i}` }));
        mockDelegate.findMany.mockResolvedValue(mockItems);

        const result = await paginate(mockDelegate, { limit: 10, cursor: null });

        // Last item ID should be 110
        expect(result.nextCursor).toBe(110);
      });
    });
  });

  // ===========================
  // SECTION 3: SOFT-DELETE FILTERING
  // ===========================

  describe('3. Soft-Delete Filter Integration', () => {
    describe('3.1 EP: Soft-Delete Filter Application', () => {
      test('EP: Should always add isDelete: false to where clause', async () => {
        mockDelegate.findMany.mockResolvedValue([]);

        await paginate(mockDelegate, { limit: 10, cursor: null });

        const callArgs = mockDelegate.findMany.mock.calls[0][0];
        expect(callArgs.where.isDelete).toBe(false);
      });

      test('EP: Should preserve existing where conditions', async () => {
        mockDelegate.findMany.mockResolvedValue([]);

        const extraWhere = { status: 'ACTIVE' };
        await paginate(mockDelegate, { limit: 10, cursor: null }, {}, extraWhere);

        const callArgs = mockDelegate.findMany.mock.calls[0][0];
        expect(callArgs.where.isDelete).toBe(false);
        expect(callArgs.where.status).toBe('ACTIVE');
      });

      test('EP: Should NOT override existing isDelete condition', async () => {
        mockDelegate.findMany.mockResolvedValue([]);

        // Try to set isDelete: true in extraWhere
        const extraWhere = { isDelete: true };
        await paginate(mockDelegate, { limit: 10, cursor: null }, {}, extraWhere);

        const callArgs = mockDelegate.findMany.mock.calls[0][0];
        // The isDelete: false from paginate should override
        expect(callArgs.where.isDelete).toBe(false);
      });
    });

    describe('3.2 BVA: Complex Where Conditions', () => {
      test('BVA: Should merge multiple extraWhere conditions', async () => {
        mockDelegate.findMany.mockResolvedValue([]);

        const extraWhere = {
          userId: 123,
          status: 'ACTIVE',
          category: 'BOOKS',
          isPublic: true,
        };

        await paginate(mockDelegate, { limit: 10, cursor: null }, {}, extraWhere);

        const callArgs = mockDelegate.findMany.mock.calls[0][0];
        expect(callArgs.where.userId).toBe(123);
        expect(callArgs.where.status).toBe('ACTIVE');
        expect(callArgs.where.category).toBe('BOOKS');
        expect(callArgs.where.isPublic).toBe(true);
        expect(callArgs.where.isDelete).toBe(false);
      });

      test('BVA: Should handle null values in extraWhere', async () => {
        mockDelegate.findMany.mockResolvedValue([]);

        const extraWhere = { userId: null, status: 'ACTIVE' };
        await paginate(mockDelegate, { limit: 10, cursor: null }, {}, extraWhere);

        const callArgs = mockDelegate.findMany.mock.calls[0][0];
        expect(callArgs.where.userId).toBeNull();
      });
    });
  });

  // ===========================
  // SECTION 4: PAGINATION SEQUENCE (Multi-page Navigation)
  // ===========================

  describe('4. Multi-Page Pagination Sequence', () => {
    test('Scenario: Navigate through 3 pages of 10 items each', async () => {
      // Page 1
      const page1Items = Array.from({ length: 11 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));
      mockDelegate.findMany.mockResolvedValueOnce(page1Items);

      const page1 = await paginate(mockDelegate, { limit: 10, cursor: null });
      expect(page1.items).toHaveLength(11);
      expect(page1.nextCursor).toBe(11);

      // Page 2 (using nextCursor from page 1)
      const page2Items = Array.from({ length: 11 }, (_, i) => ({
        id: i + 12,
        name: `Item ${i + 12}`,
      }));
      mockDelegate.findMany.mockResolvedValueOnce(page2Items);

      const page2 = await paginate(mockDelegate, { limit: 10, cursor: page1.nextCursor });
      expect(page2.items).toHaveLength(11);
      expect(page2.nextCursor).toBe(22);

      // Page 3 (final page - no nextCursor)
      const page3Items = Array.from({ length: 8 }, (_, i) => ({
        id: i + 23,
        name: `Item ${i + 23}`,
      }));
      mockDelegate.findMany.mockResolvedValueOnce(page3Items);

      const page3 = await paginate(mockDelegate, { limit: 10, cursor: page2.nextCursor });
      expect(page3.items).toHaveLength(8);
      expect(page3.nextCursor).toBeNull(); // No more items
    });
  });

  // ===========================
  // SECTION 5: OPTIONS PARAMETER
  // ===========================

  describe('5. Pagination Options', () => {
    test('Should accept pagination options parameter', async () => {
      mockDelegate.findMany.mockResolvedValue([]);

      const options = { orderBy: { createdAt: 'desc' } };
      await paginate(mockDelegate, { limit: 10, cursor: null }, options);

      expect(mockDelegate.findMany).toHaveBeenCalled();
    });

    test('Should handle undefined options (use defaults)', async () => {
      mockDelegate.findMany.mockResolvedValue([]);

      await paginate(mockDelegate, { limit: 10, cursor: null }, undefined);

      expect(mockDelegate.findMany).toHaveBeenCalled();
    });

    test('Should handle empty options object', async () => {
      mockDelegate.findMany.mockResolvedValue([]);

      await paginate(mockDelegate, { limit: 10, cursor: null }, {});

      expect(mockDelegate.findMany).toHaveBeenCalled();
    });
  });

  // ===========================
  // SECTION 6: ERROR SCENARIOS
  // ===========================

  describe('6. Error Handling', () => {
    test('Should propagate delegate errors', async () => {
      mockDelegate.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        paginate(mockDelegate, { limit: 10, cursor: null })
      ).rejects.toThrow('Database error');
    });

    test('Should handle null result from delegate', async () => {
      mockDelegate.findMany.mockResolvedValue(null);

      const result = await paginate(mockDelegate, { limit: 10, cursor: null });

      // Behavior depends on implementation - may throw or treat as []
      expect(result.items).toBeDefined();
    });
  });

  // ===========================
  // SECTION 7: VALIDATION TESTING - INPUT EDGE CASES
  // ===========================

  describe('7. Validation: Input Edge Cases', () => {
    test('Validation: Config with limit = 0', async () => {
      mockDelegate.findMany.mockResolvedValue([]);

      const result = await paginate(mockDelegate, { limit: 0, cursor: null });

      expect(result.items).toEqual([]);
    });

    test('Validation: Config with negative limit', async () => {
      mockDelegate.findMany.mockResolvedValue([]);

      const result = await paginate(mockDelegate, { limit: -10, cursor: null });

      expect(result.items).toEqual([]);
    });

    test('Validation: Very large limit (999999)', async () => {
      const mockItems = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
      mockDelegate.findMany.mockResolvedValue(mockItems);

      const result = await paginate(mockDelegate, { limit: 999999, cursor: null });

      expect(result.items).toHaveLength(100);
      expect(result.nextCursor).toBeNull(); // Less than limit
    });

    test('Validation: ExtraWhere with deeply nested conditions', async () => {
      mockDelegate.findMany.mockResolvedValue([]);

      const extraWhere = {
        AND: [{ userId: 123 }, { status: 'ACTIVE' }],
      };

      await paginate(mockDelegate, { limit: 10, cursor: null }, {}, extraWhere);

      const callArgs = mockDelegate.findMany.mock.calls[0][0];
      expect(callArgs.where.AND).toBeDefined();
    });
  });
});
