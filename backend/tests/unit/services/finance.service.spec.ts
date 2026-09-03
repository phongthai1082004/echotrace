/**
 * Finance Service - Comprehensive Unit Tests
 *
 * Methodology: EP (Equivalence Partitioning), BVA (Boundary Value Analysis), Validation Testing
 *
 * Test Coverage:
 * 1. getSummary() - Financial summary aggregation
 * 2. getSuppliers() - Supplier debt calculation with payment terms
 * 3. createExpense() - Expense creation with validation
 * 4. listIncome() - Income list with date range filtering
 * 5. listExpense() - Expense list with category filtering
 * 6. listCashflow() - Cashflow list with type filtering
 * 7. Date Range Filtering - From/to date boundaries
 * 8. Pagination - Cursor-based pagination with limits
 * 9. Validation - Amount validation, category validation
 * 10. Edge Cases - Zero amounts, large numbers, null values
 *
 * Total Tests: 50+
 */

import { FinanceService, CreateExpenseInput, ListParams } from '../../../src/features/finance/finance.service';
import { FinanceRepository } from '../../../src/features/finance/finance.repository';
import { AppError } from '../../../src/middleware/app.error';
import { ErrorCode } from '@echotrace/shared';

describe('FinanceService - Unit Tests', () => {
  let service: FinanceService;
  let mockFinanceRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFinanceRepo = {
      aggregateFinancePeriod: jest.fn(),
      listFinancePeriods: jest.fn(),
      getSupplierDebtsRaw: jest.fn(),
      createExpense: jest.fn(),
      listIncomes: jest.fn(),
      listExpenses: jest.fn(),
      listCashflows: jest.fn(),
    };

    service = new FinanceService(mockFinanceRepo);
  });

  // ==================== 1. GET SUMMARY ====================
  describe('1. EP: getSummary()', () => {
    test('EP: Valid summary → return aggregated totals', async () => {
      mockFinanceRepo.aggregateFinancePeriod.mockResolvedValue({
        _sum: {
          totalOrders: 100,
          totalRevenue: 5000000,
          totalExpense: 1000000,
          totalSupplierExpense: 2000000,
          cashInflow: 5000000,
          cashOutflow: 3000000,
          totalProfit: 2000000,
          cashOnHand: 2000000,
          receivables: 500000,
          payables: 1500000,
        },
      });

      mockFinanceRepo.listFinancePeriods.mockResolvedValue([
        { period: '2026-08', totalRevenue: 500000, totalOrders: 10 },
        { period: '2026-09', totalRevenue: 600000, totalOrders: 12 },
      ]);

      const result = await service.getSummary();

      expect(result.summary.totalOrders).toBe(100);
      expect(result.summary.totalRevenue).toBe(5000000);
      expect(result.summary.totalExpense).toBe(1000000);
      expect(result.summary.totalProfit).toBe(2000000);
      expect(result.monthly).toBeDefined();
      expect(result.monthly.length).toBeGreaterThan(0);
    });

    test('EP: Empty periods → return zeros', async () => {
      mockFinanceRepo.aggregateFinancePeriod.mockResolvedValue({
        _sum: {
          totalOrders: null,
          totalRevenue: null,
          totalExpense: null,
          totalSupplierExpense: null,
          cashInflow: null,
          cashOutflow: null,
          totalProfit: null,
          cashOnHand: null,
          receivables: null,
          payables: null,
        },
      });

      mockFinanceRepo.listFinancePeriods.mockResolvedValue([]);

      const result = await service.getSummary();

      expect(result.summary.totalOrders).toBe(0);
      expect(result.summary.totalRevenue).toBe(0);
      expect(result.summary.totalProfit).toBe(0);
    });

    test('EP: Monthly breakdown includes last 12 months', async () => {
      mockFinanceRepo.aggregateFinancePeriod.mockResolvedValue({ _sum: {} });
      mockFinanceRepo.listFinancePeriods.mockResolvedValue([]);

      const result = await service.getSummary();

      expect(result.monthly.length).toBe(12);
      // Should include current month
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      expect(result.monthly.some((m) => m.period === currentPeriod)).toBe(true);
    });

    test('BVA: Very large revenue numbers', async () => {
      const largeNum = 999999999;
      mockFinanceRepo.aggregateFinancePeriod.mockResolvedValue({
        _sum: {
          totalRevenue: largeNum,
          totalExpense: largeNum,
          totalProfit: 0,
          totalOrders: 100000,
          totalSupplierExpense: 0,
          cashInflow: 0,
          cashOutflow: 0,
          cashOnHand: 0,
          receivables: 0,
          payables: 0,
        },
      });
      mockFinanceRepo.listFinancePeriods.mockResolvedValue([]);

      const result = await service.getSummary();

      expect(result.summary.totalRevenue).toBe(largeNum);
      expect(result.summary.totalExpense).toBe(largeNum);
    });
  });

  // ==================== 2. GET SUPPLIERS ====================
  describe('2. EP: getSuppliers()', () => {
    test('EP: Valid suppliers with debt → return debt data', async () => {
      mockFinanceRepo.getSupplierDebtsRaw.mockResolvedValue([
        { id: 1, name: 'Supplier A', totalDebt: 5000000, thisMonth: 2000000 },
        { id: 2, name: 'Supplier B', totalDebt: 3000000, thisMonth: 1000000 },
      ]);

      const result = await service.getSuppliers();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].name).toBe('Supplier A');
      expect(result[0].totalDebt).toBe(5000000);
      expect(result[0].thisMonth).toBe(2000000);
    });

    test('EP: No suppliers → return empty array', async () => {
      mockFinanceRepo.getSupplierDebtsRaw.mockResolvedValue([]);

      const result = await service.getSuppliers();

      expect(result).toEqual([]);
    });

    test('EP: Null debt values → convert to 0', async () => {
      mockFinanceRepo.getSupplierDebtsRaw.mockResolvedValue([
        { id: 1, name: 'Supplier A', totalDebt: null, thisMonth: null },
      ]);

      const result = await service.getSuppliers();

      expect(result[0].totalDebt).toBe(0);
      expect(result[0].thisMonth).toBe(0);
    });

    test('BVA: Debt at payment terms boundary', async () => {
      mockFinanceRepo.getSupplierDebtsRaw.mockResolvedValue([
        { id: 1, name: 'Supplier', totalDebt: 14000000, thisMonth: 0 }, // 14 days old
      ]);

      const result = await service.getSuppliers();

      expect(result[0].totalDebt).toBe(14000000);
    });

    test('BVA: Large number of suppliers', async () => {
      const suppliers = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Supplier ${i + 1}`,
        totalDebt: 1000000,
        thisMonth: 100000,
      }));

      mockFinanceRepo.getSupplierDebtsRaw.mockResolvedValue(suppliers);

      const result = await service.getSuppliers();

      expect(result).toHaveLength(100);
    });
  });

  // ==================== 3. CREATE EXPENSE ====================
  describe('3. EP: createExpense()', () => {
    describe('3.1 Valid Expense Categories', () => {
      const validCategories = ['OPERATING', 'PAYROLL', 'MARKETING', 'DEBT', 'OTHER', 'SUPPLIER', 'DEFECTIVE'];

      validCategories.forEach((category) => {
        test(`EP: ${category} category → success`, async () => {
          const input: CreateExpenseInput = {
            amount: 500000,
            category,
            description: 'Office supplies',
            date: '2026-08-30',
            note: 'Q3 office supplies',
          };

          mockFinanceRepo.createExpense.mockResolvedValue({ id: 1, ...input });

          const result = await service.createExpense(input);

          expect(mockFinanceRepo.createExpense).toHaveBeenCalledWith(
            expect.objectContaining({
              amount: 500000,
              category,
            }),
          );
          expect(result.id).toBe(1);
        });
      });
    });

    describe('3.2 Invalid Categories', () => {
      test('Validation: Invalid category → error 400', async () => {
        const input: CreateExpenseInput = {
          amount: 500000,
          category: 'INVALID_CATEGORY',
        };

        await expect(service.createExpense(input)).rejects.toThrow(
          expect.objectContaining({ statusCode: 400 }),
        );
      });
    });

    describe('3.3 Amount Validation (BVA)', () => {
      test('BVA: Positive amount (1) → success', async () => {
        const input: CreateExpenseInput = {
          amount: 1,
          category: 'OTHER',
        };

        mockFinanceRepo.createExpense.mockResolvedValue({ id: 1, ...input });

        const result = await service.createExpense(input);

        expect(result).toBeDefined();
      });

      test('BVA: Zero amount (0) → error 400', async () => {
        const input: CreateExpenseInput = {
          amount: 0,
          category: 'OTHER',
        };

        await expect(service.createExpense(input)).rejects.toThrow();
      });

      test('BVA: Negative amount (-100) → error 400', async () => {
        const input: CreateExpenseInput = {
          amount: -100,
          category: 'OTHER',
        };

        await expect(service.createExpense(input)).rejects.toThrow();
      });

      test('BVA: Very large amount (999999999) → success', async () => {
        const input: CreateExpenseInput = {
          amount: 999999999,
          category: 'OTHER',
        };

        mockFinanceRepo.createExpense.mockResolvedValue({ id: 1, ...input });

        const result = await service.createExpense(input);

        expect(result).toBeDefined();
      });

      test('Validation: Non-finite amount (Infinity) → error 400', async () => {
        const input: CreateExpenseInput = {
          amount: Infinity,
          category: 'OTHER',
        };

        await expect(service.createExpense(input)).rejects.toThrow();
      });

      test('Validation: NaN amount → error 400', async () => {
        const input: CreateExpenseInput = {
          amount: NaN,
          category: 'OTHER',
        };

        await expect(service.createExpense(input)).rejects.toThrow();
      });
    });

    describe('3.4 Date Handling', () => {
      test('EP: Provided date → use as-is', async () => {
        const input: CreateExpenseInput = {
          amount: 100000,
          category: 'OTHER',
          date: '2026-08-25',
        };

        mockFinanceRepo.createExpense.mockResolvedValue({ id: 1 });

        await service.createExpense(input);

        expect(mockFinanceRepo.createExpense).toHaveBeenCalledWith(
          expect.objectContaining({
            date: new Date('2026-08-25'),
          }),
        );
      });

      test('EP: No date provided → use current date', async () => {
        const input: CreateExpenseInput = {
          amount: 100000,
          category: 'OTHER',
        };

        mockFinanceRepo.createExpense.mockResolvedValue({ id: 1 });

        const beforeCall = new Date();
        await service.createExpense(input);
        const afterCall = new Date();

        const callDate = mockFinanceRepo.createExpense.mock.calls[0][0].date;
        expect(callDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
        expect(callDate.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      });
    });

    describe('3.5 Optional Fields', () => {
      test('EP: With optional fields', async () => {
        const input: CreateExpenseInput = {
          amount: 100000,
          category: 'SUPPLIER',
          description: 'Paper order',
          supplierName: 'Supplier A',
          note: 'For Q3 production',
        };

        mockFinanceRepo.createExpense.mockResolvedValue({ id: 1 });

        await service.createExpense(input);

        expect(mockFinanceRepo.createExpense).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Paper order',
            supplierName: 'Supplier A',
            note: 'For Q3 production',
          }),
        );
      });

      test('EP: Without optional fields', async () => {
        const input: CreateExpenseInput = {
          amount: 100000,
          category: 'OTHER',
        };

        mockFinanceRepo.createExpense.mockResolvedValue({ id: 1 });

        await service.createExpense(input);

        expect(mockFinanceRepo.createExpense).toHaveBeenCalled();
      });
    });
  });

  // ==================== 4. LIST INCOME ====================
  describe('4. EP: listIncome()', () => {
    test('EP: List incomes without filter → success', async () => {
      mockFinanceRepo.listIncomes.mockResolvedValue([
        { id: 1, amount: 100000, receivedAt: new Date() },
        { id: 2, amount: 200000, receivedAt: new Date() },
      ]);

      const result = await service.listIncome({});

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
    });

    test('EP: List incomes with date range (from/to)', async () => {
      const incomes = [{ id: 1, amount: 100000, receivedAt: new Date('2026-08-15') }];
      mockFinanceRepo.listIncomes.mockResolvedValue(incomes);

      const params: ListParams = {
        from: '2026-08-01',
        to: '2026-08-31',
      };

      const result = await service.listIncome(params);

      expect(result.items).toEqual(incomes);
      expect(mockFinanceRepo.listIncomes).toHaveBeenCalledWith(
        expect.objectContaining({
          receivedAt: expect.any(Object),
        }),
        undefined,
      );
    });

    test('EP: List incomes with pagination', async () => {
      const incomes = Array.from({ length: 21 }, (_, i) => ({
        id: i + 1,
        amount: 100000 * (i + 1),
        receivedAt: new Date(),
      }));

      mockFinanceRepo.listIncomes.mockResolvedValue(incomes);

      const result = await service.listIncome({ limit: 20 });

      expect(result.items).toHaveLength(21);
      expect(result.nextCursor).toBe(21); // Last item id
    });

    test('EP: Incomes fit in one page → nextCursor null', async () => {
      const incomes = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        amount: 100000,
        receivedAt: new Date(),
      }));

      mockFinanceRepo.listIncomes.mockResolvedValue(incomes);

      const result = await service.listIncome({ limit: 20 });

      expect(result.nextCursor).toBeNull();
    });

    test('BVA: Large limit (1000) → success', async () => {
      mockFinanceRepo.listIncomes.mockResolvedValue([]);

      await service.listIncome({ limit: 1000 });

      expect(mockFinanceRepo.listIncomes).toHaveBeenCalled();
    });

    test('BVA: No limit (default 20)', async () => {
      mockFinanceRepo.listIncomes.mockResolvedValue([]);

      await service.listIncome({});

      expect(mockFinanceRepo.listIncomes).toHaveBeenCalled();
    });
  });

  // ==================== 5. LIST EXPENSE ====================
  describe('5. EP: listExpense()', () => {
    test('EP: List expenses without filter → success', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([
        { id: 1, amount: 50000, category: 'OPERATING' },
        { id: 2, amount: 100000, category: 'PAYROLL' },
      ]);

      const result = await service.listExpense({});

      expect(result.items).toHaveLength(2);
    });

    test('EP: List expenses with category filter', async () => {
      const expenses = [
        { id: 1, amount: 50000, category: 'OPERATING', date: new Date() },
      ];

      mockFinanceRepo.listExpenses.mockResolvedValue(expenses);

      const params: ListParams = { category: 'OPERATING' };

      const result = await service.listExpense(params);

      expect(mockFinanceRepo.listExpenses).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'OPERATING',
        }),
        undefined,
      );
    });

    test('EP: List expenses with date range', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      const params: ListParams = {
        from: '2026-08-01',
        to: '2026-08-31',
      };

      await service.listExpense(params);

      expect(mockFinanceRepo.listExpenses).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(Object),
        }),
        undefined,
      );
    });

    test('EP: List expenses with category and date range', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      const params: ListParams = {
        category: 'SUPPLIER',
        from: '2026-08-01',
        to: '2026-08-31',
      };

      await service.listExpense(params);

      expect(mockFinanceRepo.listExpenses).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'SUPPLIER',
          date: expect.any(Object),
        }),
        undefined,
      );
    });
  });

  // ==================== 6. LIST CASHFLOW ====================
  describe('6. EP: listCashflow()', () => {
    test('EP: List cashflows without filter → success', async () => {
      mockFinanceRepo.listCashflows.mockResolvedValue([
        { id: 1, amount: 100000, type: 'IN' },
        { id: 2, amount: 50000, type: 'OUT' },
      ]);

      const result = await service.listCashflow({});

      expect(result.items).toHaveLength(2);
    });

    test('EP: List cashflows with IN type', async () => {
      mockFinanceRepo.listCashflows.mockResolvedValue([
        { id: 1, amount: 100000, type: 'IN', date: new Date() },
      ]);

      const result = await service.listCashflow({ type: 'IN' });

      expect(mockFinanceRepo.listCashflows).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'IN' }),
        undefined,
      );
    });

    test('EP: List cashflows with OUT type', async () => {
      mockFinanceRepo.listCashflows.mockResolvedValue([
        { id: 1, amount: 50000, type: 'OUT', date: new Date() },
      ]);

      await service.listCashflow({ type: 'OUT' });

      expect(mockFinanceRepo.listCashflows).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'OUT' }),
        undefined,
      );
    });

    test('EP: List cashflows with date range', async () => {
      mockFinanceRepo.listCashflows.mockResolvedValue([]);

      const params: ListParams = {
        from: '2026-08-01',
        to: '2026-08-31',
      };

      await service.listCashflow(params);

      expect(mockFinanceRepo.listCashflows).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(Object),
        }),
        undefined,
      );
    });

    test('EP: List cashflows with type and date range', async () => {
      mockFinanceRepo.listCashflows.mockResolvedValue([]);

      const params: ListParams = {
        type: 'IN',
        from: '2026-08-01',
        to: '2026-08-31',
      };

      await service.listCashflow(params);

      expect(mockFinanceRepo.listCashflows).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'IN',
          date: expect.any(Object),
        }),
        undefined,
      );
    });
  });

  // ==================== 7. DATE RANGE FILTERING ====================
  describe('7. BVA: Date Range Boundaries', () => {
    test('BVA: From date only → gte filter', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      await service.listExpense({ from: '2026-08-15' });

      const callArgs = mockFinanceRepo.listExpenses.mock.calls[0][0];
      expect(callArgs.date.gte).toBeDefined();
      expect(callArgs.date.lte).toBeUndefined();
    });

    test('BVA: To date only → lte filter', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      await service.listExpense({ to: '2026-08-15' });

      const callArgs = mockFinanceRepo.listExpenses.mock.calls[0][0];
      expect(callArgs.date.lte).toBeDefined();
      expect(callArgs.date.gte).toBeUndefined();
    });

    test('BVA: Both from and to → range filter', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      await service.listExpense({ from: '2026-08-01', to: '2026-08-31' });

      const callArgs = mockFinanceRepo.listExpenses.mock.calls[0][0];
      expect(callArgs.date.gte).toBeDefined();
      expect(callArgs.date.lte).toBeDefined();
    });

    test('BVA: To date with time adjustment (adds 23:59:59.999Z)', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      await service.listExpense({ to: '2026-08-31' });

      const callArgs = mockFinanceRepo.listExpenses.mock.calls[0][0];
      const toDate = callArgs.date.lte;
      expect(toDate.toISOString()).toContain('23:59:59');
    });
  });

  // ==================== 8. PAGINATION ====================
  describe('8. EP: Pagination', () => {
    test('EP: Default limit (20) when not specified', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({ id: i + 1 })),
      );

      const result = await service.listExpense({});

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBeNull();
    });

    test('EP: Custom limit applied', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue(
        Array.from({ length: 50 }, (_, i) => ({ id: i + 1 })),
      );

      const result = await service.listExpense({ limit: 50 });

      expect(mockFinanceRepo.listExpenses).toHaveBeenCalledWith(
        expect.any(Object),
        50,
      );
    });

    test('EP: Items exactly match limit → nextCursor null', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({ id: i + 1 })),
      );

      const result = await service.listExpense({ limit: 20 });

      expect(result.nextCursor).toBeNull();
    });

    test('EP: More items than limit → nextCursor set to last item id', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue(
        Array.from({ length: 21 }, (_, i) => ({ id: i + 1 })),
      );

      const result = await service.listExpense({ limit: 20 });

      expect(result.nextCursor).toBe(21);
    });
  });

  // ==================== 9. ERROR HANDLING ====================
  describe('9. Error Handling', () => {
    test('Error: Database error → propagate', async () => {
      mockFinanceRepo.aggregateFinancePeriod.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.getSummary()).rejects.toThrow(
        'Database connection failed',
      );
    });

    test('Error: Invalid date format', async () => {
      mockFinanceRepo.listExpenses.mockRejectedValue(
        new Error('Invalid date'),
      );

      await expect(
        service.listExpense({ from: 'invalid-date' }),
      ).rejects.toThrow();
    });
  });

  // ==================== 10. EDGE CASES ====================
  describe('10. Edge Cases', () => {
    test('Edge: Empty summary with no data', async () => {
      mockFinanceRepo.aggregateFinancePeriod.mockResolvedValue({
        _sum: {
          totalOrders: null,
          totalRevenue: null,
          totalExpense: null,
          totalSupplierExpense: null,
          cashInflow: null,
          cashOutflow: null,
          totalProfit: null,
          cashOnHand: null,
          receivables: null,
          payables: null,
        },
      });
      mockFinanceRepo.listFinancePeriods.mockResolvedValue([]);

      const result = await service.getSummary();

      // All should be 0, not null
      expect(result.summary.totalOrders).toBe(0);
      expect(Object.values(result.summary).every((v) => typeof v === 'number')).toBe(true);
    });

    test('Edge: Negative numbers from database (should preserve)', async () => {
      mockFinanceRepo.aggregateFinancePeriod.mockResolvedValue({
        _sum: {
          totalProfit: -500000, // Loss
          totalOrders: 0,
          totalRevenue: 0,
          totalExpense: 0,
          totalSupplierExpense: 0,
          cashInflow: 0,
          cashOutflow: 0,
          cashOnHand: 0,
          receivables: 0,
          payables: 0,
        },
      });
      mockFinanceRepo.listFinancePeriods.mockResolvedValue([]);

      const result = await service.getSummary();

      expect(result.summary.totalProfit).toBe(-500000);
    });

    test('Edge: Very old date range (multiple years)', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      const params: ListParams = {
        from: '2020-01-01',
        to: '2026-08-31',
      };

      await service.listExpense(params);

      expect(mockFinanceRepo.listExpenses).toHaveBeenCalled();
    });

    test('Edge: Future date range', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      const params: ListParams = {
        from: '2026-12-01',
        to: '2026-12-31',
      };

      await service.listExpense(params);

      expect(mockFinanceRepo.listExpenses).toHaveBeenCalled();
    });
  });
});

    });

    test('BVA: Both from and to → bounded range', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      await service.listExpense({
        from: '2026-08-01',
        to: '2026-08-31',
      });

      const callArgs = mockFinanceRepo.listExpenses.mock.calls[0][0];
      expect(callArgs.date.gte).toBeDefined();
      expect(callArgs.date.lte).toBeDefined();
    });

    test('BVA: Month boundary start (2026-08-01 00:00:00)', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      await service.listExpense({ from: '2026-08-01' });

      const callArgs = mockFinanceRepo.listExpenses.mock.calls[0][0];
      expect(callArgs.date.gte).toEqual(new Date('2026-08-01T00:00:00Z'));
    });

    test('BVA: Month boundary end (2026-08-31 23:59:59)', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      await service.listExpense({ to: '2026-08-31' });

      const callArgs = mockFinanceRepo.listExpenses.mock.calls[0][0];
      expect(callArgs.date.lte).toBeDefined();
    });

    test('BVA: Year boundary (2026-01-01 to 2026-12-31)', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      await service.listExpense({
        from: '2026-01-01',
        to: '2026-12-31',
      });

      const callArgs = mockFinanceRepo.listExpenses.mock.calls[0][0];
      expect(callArgs.date.gte).toBeDefined();
      expect(callArgs.date.lte).toBeDefined();
    });

    test('Error: Invalid date format', async () => {
      await expect(
        service.listExpense({ from: 'not-a-date' })
      ).rejects.toThrow();
    });

    test('Error: From date > To date (logically invalid)', async () => {
      await expect(
        service.listExpense({
          from: '2026-12-31',
          to: '2026-01-01',
        })
      ).rejects.toThrow();
    });
  });

  // ==================== 8. MONTHLY PERIOD FILLING ====================
  describe('8. EP: Monthly Summary with Missing Months', () => {
    test('EP: Database missing August → fill with zero', async () => {
      mockFinanceRepo.listFinancePeriods.mockResolvedValue([
        { period: '2026-07', totalRevenue: 500000 },
        { period: '2026-09', totalRevenue: 600000 },
        // August missing
      ]);

      const result = await service.getSummary();

      const augustEntry = result.monthly.find((m) => m.period === '2026-08');
      expect(augustEntry).toBeDefined();
      expect(augustEntry.totalRevenue).toBe(0);
    });

    test('EP: Multiple missing months → fill all with zeros', async () => {
      mockFinanceRepo.aggregateFinancePeriod.mockResolvedValue({ _sum: {} });
      mockFinanceRepo.listFinancePeriods.mockResolvedValue([
        { period: '2026-01', totalRevenue: 500000 },
        { period: '2026-12', totalRevenue: 600000 },
        // Months 02-11 missing
      ]);

      const result = await service.getSummary();

      // Should have all 12 months
      expect(result.monthly.length).toBe(12);
      const filledMonths = result.monthly.filter((m) => m.totalRevenue === 0);
      expect(filledMonths.length).toBeGreaterThan(0);
    });

    test('BVA: Current month data should be included', async () => {
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      mockFinanceRepo.aggregateFinancePeriod.mockResolvedValue({ _sum: {} });
      mockFinanceRepo.listFinancePeriods.mockResolvedValue([]);

      const result = await service.getSummary();

      const currentEntry = result.monthly.find((m) => m.period === currentPeriod);
      expect(currentEntry).toBeDefined();
    });
  });

  // ==================== 9. SUPPLIER DEBT CALCULATIONS ====================
  describe('9. EP: Supplier Debt with Payment Terms', () => {
    test('EP: Supplier with 30-day payment term → due date calculated', async () => {
      mockFinanceRepo.getSupplierDebtsRaw.mockResolvedValue([
        {
          id: 1,
          name: 'Supplier A',
          paymentTermDays: 30,
          totalDebt: 5000000,
          oldestInvoiceDate: '2026-08-01',
          thisMonth: 1000000,
        },
      ]);

      const result = await service.getSuppliers();

      expect(result[0].paymentTermDays).toBe(30);
      expect(result[0].dueDate).toBeDefined();
    });

    test('EP: Supplier with 60-day payment term → later due date', async () => {
      mockFinanceRepo.getSupplierDebtsRaw.mockResolvedValue([
        {
          id: 1,
          name: 'Supplier A',
          paymentTermDays: 60,
          totalDebt: 5000000,
          oldestInvoiceDate: '2026-08-01',
          thisMonth: 1000000,
        },
      ]);

      const result = await service.getSuppliers();

      expect(result[0].paymentTermDays).toBe(60);
      expect(result[0].dueDate).toBeDefined();
    });

    test('EP: Overdue supplier (invoice date + term < today)', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 35); // 35 days ago

      mockFinanceRepo.getSupplierDebtsRaw.mockResolvedValue([
        {
          id: 1,
          name: 'Supplier A',
          paymentTermDays: 30,
          totalDebt: 5000000,
          oldestInvoiceDate: pastDate.toISOString().split('T')[0],
          thisMonth: 1000000,
          isOverdue: true,
        },
      ]);

      const result = await service.getSuppliers();

      expect(result[0].isOverdue).toBe(true);
    });

    test('BVA: Zero-day payment term (COD)', async () => {
      mockFinanceRepo.getSupplierDebtsRaw.mockResolvedValue([
        {
          id: 1,
          name: 'Supplier COD',
          paymentTermDays: 0,
          totalDebt: 0, // No debt for COD
          oldestInvoiceDate: null,
          thisMonth: 0,
        },
      ]);

      const result = await service.getSuppliers();

      expect(result[0].totalDebt).toBe(0);
    });

    test('BVA: Large payment term (180 days)', async () => {
      mockFinanceRepo.getSupplierDebtsRaw.mockResolvedValue([
        {
          id: 1,
          name: 'Supplier Credit',
          paymentTermDays: 180,
          totalDebt: 50000000, // Large debt
          oldestInvoiceDate: '2026-08-01',
          thisMonth: 5000000,
        },
      ]);

      const result = await service.getSuppliers();

      expect(result[0].paymentTermDays).toBe(180);
      expect(result[0].totalDebt).toBe(50000000);
    });
  });

  // ==================== 10. EXPENSE CATEGORY VALIDATION ====================
  describe('10. EP: Expense Category Validation', () => {
    test('EP: Valid category SHIPPING', async () => {
      mockFinanceRepo.createExpense.mockResolvedValue({
        id: 1,
        category: 'SHIPPING',
        amount: 500000,
      });

      const result = await service.createExpense({
        category: 'SHIPPING',
        amount: 500000,
        note: 'Shipping cost',
      });

      expect(result.category).toBe('SHIPPING');
    });

    test('EP: Valid category EQUIPMENT', async () => {
      mockFinanceRepo.createExpense.mockResolvedValue({
        id: 2,
        category: 'EQUIPMENT',
        amount: 2000000,
      });

      const result = await service.createExpense({
        category: 'EQUIPMENT',
        amount: 2000000,
        note: 'New printer',
      });

      expect(result.category).toBe('EQUIPMENT');
    });

    test('EP: Valid category LABOR', async () => {
      mockFinanceRepo.createExpense.mockResolvedValue({
        id: 3,
        category: 'LABOR',
        amount: 5000000,
      });

      const result = await service.createExpense({
        category: 'LABOR',
        amount: 5000000,
        note: 'Staff salary',
      });

      expect(result.category).toBe('LABOR');
    });

    test('Error: Invalid category', async () => {
      await expect(
        service.createExpense({
          category: 'INVALID_CATEGORY',
          amount: 100000,
        })
      ).rejects.toThrow();
    });

    test('Error: Empty category', async () => {
      await expect(
        service.createExpense({
          category: '',
          amount: 100000,
        })
      ).rejects.toThrow();
    });
  });

  // ==================== 11. AMOUNT VALIDATION ====================
  describe('11. BVA: Expense Amount Validation', () => {
    test('BVA: Zero amount', async () => {
      await expect(
        service.createExpense({
          category: 'SHIPPING',
          amount: 0,
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });

    test('BVA: Negative amount', async () => {
      await expect(
        service.createExpense({
          category: 'SHIPPING',
          amount: -100000,
        })
      ).rejects.toThrow('Amount must be greater than 0');
    });

    test('BVA: Very large amount (1 billion VND)', async () => {
      mockFinanceRepo.createExpense.mockResolvedValue({
        id: 4,
        category: 'EQUIPMENT',
        amount: 1000000000,
      });

      const result = await service.createExpense({
        category: 'EQUIPMENT',
        amount: 1000000000,
      });

      expect(result.amount).toBe(1000000000);
    });

    test('BVA: Decimal amount (should be integer)', async () => {
      await expect(
        service.createExpense({
          category: 'SHIPPING',
          amount: 100000.5, // Invalid decimal
        })
      ).rejects.toThrow();
    });

    test('BVA: Minimum valid amount (1 VND)', async () => {
      mockFinanceRepo.createExpense.mockResolvedValue({
        id: 5,
        category: 'SHIPPING',
        amount: 1,
      });

      const result = await service.createExpense({
        category: 'SHIPPING',
        amount: 1,
      });

      expect(result.amount).toBe(1);
    });
  });

  // ==================== 12. PAGINATION EDGE CASES ====================
  describe('12. EP: Pagination with Large Datasets', () => {
    test('EP: Cursor pagination with 1000+ records', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue(
        Array(1000)
          .fill(null)
          .map((_, i) => ({
            id: i,
            category: 'SHIPPING',
            amount: 100000,
          }))
      );

      const result = await service.listExpense({ limit: 50 });

      expect(result).toHaveLength(50);
    });

    test('EP: Last page has fewer records', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue(
        Array(37)
          .fill(null)
          .map((_, i) => ({
            id: i,
            category: 'SHIPPING',
            amount: 100000,
          }))
      );

      const result = await service.listExpense({ limit: 50 });

      expect(result).toHaveLength(37);
    });

    test('BVA: Cursor pagination with empty result', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      const result = await service.listExpense({ limit: 50 });

      expect(result).toHaveLength(0);
    });

    test('BVA: Large limit (10000)', async () => {
      mockFinanceRepo.listExpenses.mockResolvedValue([]);

      await service.listExpense({ limit: 10000 });

      expect(mockFinanceRepo.listExpenses).toHaveBeenCalled();
    });
  });
});
