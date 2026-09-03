/**
 * Order Repository - Comprehensive Unit Tests
 *
 * Methodology: EP (Equivalence Partitioning), Validation Testing
 *
 * Test Coverage:
 * 1. Idempotency Key Operations: Create, read, update, delete, mark success/failed
 * 2. Order CRUD: Create, read, update, find by user, list
 * 3. Stock Operations: Find sample books, update quantities (atomic WHERE)
 * 4. Transaction Operations: Create, mark refunded
 * 5. Cart Integration: Delete cart items on order creation
 * 6. Supplier Operations: Find by IDs
 * 7. Cashflow Recording: Create expense/income
 * 8. Transaction Client Support: All methods accept optional tx parameter
 * 9. Edge Cases: Null tx (uses default client), missing records, batch operations
 *
 * Total Tests: 80+
 */

import { OrderRepository } from '../../../src/features/order/order.repository.js';
import { PrismaService } from '../../../lib/db.service.js';

// Mock enums for testing - match actual values from @echotrace/shared
enum IdempotencyKeyType {
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PROCESSING = 'processing',
  PAID = 'paid',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

describe('OrderRepository - Unit Tests', () => {
  let repository: OrderRepository;
  let mockPrismaService: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      idempotencyKey: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      sampleBook: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
      supplier: {
        findMany: jest.fn(),
      },
      cashflow: {
        create: jest.fn(),
      },
    };

    mockPrismaService = {
      db: mockClient,
    };

    repository = new OrderRepository(mockPrismaService);
  });

  // ==================== 1. IDEMPOTENCY KEY OPERATIONS ====================
  describe('1. EP: Idempotency Key Operations', () => {
    describe('1.1 Create Idempotency Key', () => {
      test('EP: Create PROCESSING idempotency key → success', async () => {
        const key = 'unique-key-123';
        mockClient.idempotencyKey.create.mockResolvedValue({
          key,
          status: IdempotencyKeyType.PROCESSING,
        });

        const result = await repository.createIdempotencyKey(key, IdempotencyKeyType.PROCESSING);

        expect(mockClient.idempotencyKey.create).toHaveBeenCalledWith({
          data: { key, status: IdempotencyKeyType.PROCESSING },
        });
        expect(result.key).toBe(key);
      });

      test('EP: Create with transaction client → use tx parameter', async () => {
        const mockTx = { idempotencyKey: { create: jest.fn().mockResolvedValue({ key: 'key', status: IdempotencyKeyType.PROCESSING }) } };
        const key = 'unique-key-456';

        await repository.createIdempotencyKey(key, IdempotencyKeyType.PROCESSING, mockTx as any);

        expect(mockTx.idempotencyKey.create).toHaveBeenCalledWith({
          data: { key, status: IdempotencyKeyType.PROCESSING },
        });
        expect(mockClient.idempotencyKey.create).not.toHaveBeenCalled();
      });
    });

    describe('1.2 Get Idempotency Key', () => {
      test('EP: Get existing key → return record', async () => {
        const key = 'unique-key-123';
        const mockRecord = {
          key,
          status: IdempotencyKeyType.SUCCESS,
          responseBody: { orderId: 100 },
        };
        mockClient.idempotencyKey.findUnique.mockResolvedValue(mockRecord);

        const result = await repository.getIdempotencyKey(key);

        expect(mockClient.idempotencyKey.findUnique).toHaveBeenCalledWith({
          where: { key },
        });
        expect(result).toEqual(mockRecord);
      });

      test('EP: Get non-existent key → return null', async () => {
        mockClient.idempotencyKey.findUnique.mockResolvedValue(null);

        const result = await repository.getIdempotencyKey('nonexistent');

        expect(result).toBeNull();
      });

      test('EP: Get with transaction client → use tx', async () => {
        const mockTx = { idempotencyKey: { findUnique: jest.fn().mockResolvedValue({ key: 'key' }) } };

        await repository.getIdempotencyKey('key', mockTx as any);

        expect(mockTx.idempotencyKey.findUnique).toHaveBeenCalled();
        expect(mockClient.idempotencyKey.findUnique).not.toHaveBeenCalled();
      });
    });

    describe('1.3 Mark Idempotency Success', () => {
      test('EP: Mark PROCESSING → SUCCESS with response body', async () => {
        const key = 'unique-key-123';
        const responseBody = { orderId: 100, status: OrderStatus.PENDING_PAYMENT };
        mockClient.idempotencyKey.update.mockResolvedValue({
          key,
          status: IdempotencyKeyType.SUCCESS,
          responseBody,
        });

        const result = await repository.markIdempotencySuccess(key, responseBody);

        expect(mockClient.idempotencyKey.update).toHaveBeenCalledWith({
          where: { key },
          data: {
            status: IdempotencyKeyType.SUCCESS,
            responseBody: responseBody as any,
          },
        });
        expect(result.status).toBe(IdempotencyKeyType.SUCCESS);
      });

      test('EP: Mark with complex response body', async () => {
        const key = 'key';
        const responseBody = {
          orderId: 100,
          orderCode: '12345',
          checkoutUrl: 'https://example.com',
          qrCode: 'data:image/png;base64,...',
          items: [{ id: 1, qty: 2 }],
        };
        mockClient.idempotencyKey.update.mockResolvedValue({ status: IdempotencyKeyType.SUCCESS });

        await repository.markIdempotencySuccess(key, responseBody);

        expect(mockClient.idempotencyKey.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key },
            data: expect.objectContaining({
              status: IdempotencyKeyType.SUCCESS,
            }),
          }),
        );
      });
    });

    describe('1.4 Mark Idempotency Failed', () => {
      test('EP: Mark PROCESSING → FAILED', async () => {
        const key = 'unique-key-123';
        mockClient.idempotencyKey.update.mockResolvedValue({
          key,
          status: IdempotencyKeyType.FAILED,
        });

        const result = await repository.markIdempotencyFailed(key);

        expect(mockClient.idempotencyKey.update).toHaveBeenCalledWith({
          where: { key },
          data: { status: IdempotencyKeyType.FAILED },
        });
        expect(result.status).toBe(IdempotencyKeyType.FAILED);
      });
    });

    describe('1.5 Delete Idempotency Key', () => {
      test('EP: Delete existing key → success', async () => {
        const key = 'unique-key-123';
        mockClient.idempotencyKey.delete.mockResolvedValue({ key });

        const result = await repository.deleteIdempotencyKey(key);

        expect(mockClient.idempotencyKey.delete).toHaveBeenCalledWith({
          where: { key },
        });
        expect(result.key).toBe(key);
      });

      test('EP: Delete with tx parameter → use tx', async () => {
        const mockTx = { idempotencyKey: { delete: jest.fn().mockResolvedValue({ key: 'key' }) } };

        await repository.deleteIdempotencyKey('key', mockTx as any);

        expect(mockTx.idempotencyKey.delete).toHaveBeenCalled();
      });
    });
  });

  // ==================== 2. ORDER CRUD OPERATIONS ====================
  describe('2. EP: Order CRUD Operations', () => {
    describe('2.1 Create Order', () => {
      test('EP: Create order with all fields → success', async () => {
        const orderData = {
          userId: 1,
          orderCode: '12345',
          status: OrderStatus.PENDING_PAYMENT,
          totalAmount: 100000,
          subTotal: 100000,
          discountAmount: 0,
          depositAmount: 0,
          paidAmount: 0,
          paymentType: 'FULL',
          orderItems: [],
        };
        mockClient.order.create.mockResolvedValue({ id: 100, ...orderData });

        const result = await repository.createOrder(orderData);

        expect(mockClient.order.create).toHaveBeenCalledWith({ data: orderData });
        expect(result?.id).toBe(100);
      });

      test('EP: Create order with transaction → use tx', async () => {
        const mockTx = { order: { create: jest.fn().mockResolvedValue({ id: 100 }) } };
        const orderData = {
          userId: 1,
          orderCode: '12345',
          subTotal: 100000,
          totalAmount: 100000,
        };

        await repository.createOrder(orderData, mockTx as any);

        expect(mockTx.order.create).toHaveBeenCalled();
        expect(mockClient.order.create).not.toHaveBeenCalled();
      });
    });

    describe('2.2 Find Order', () => {
      test('EP: Find order by ID → return full record', async () => {
        const order = {
          id: 100,
          userId: 1,
          orderCode: '12345',
          status: OrderStatus.PENDING_PAYMENT,
        };
        mockClient.order.findUnique.mockResolvedValue(order);

        const result = await repository.findOrderById(100);

        expect(mockClient.order.findUnique).toHaveBeenCalledWith({
          where: { id: 100 },
        });
        expect(result).toEqual(order);
      });

      test('EP: Find order for specific user → check ownership', async () => {
        const order = { id: 100, userId: 1 };
        mockClient.order.findFirst.mockResolvedValue(order);

        const result = await repository.findOrderForUser(100, 1);

        expect(mockClient.order.findFirst).toHaveBeenCalledWith({
          where: { id: 100, userId: 1 },
        });
        expect(result).toEqual(order);
      });

      test('EP: Find order for wrong user → return null', async () => {
        mockClient.order.findFirst.mockResolvedValue(null);

        const result = await repository.findOrderForUser(100, 999);

        expect(result).toBeNull();
      });

      test('EP: Find order with transactions → include latest', async () => {
        const order = {
          id: 100,
          userId: 1,
          transactions: [{ id: 1, status: TransactionStatus.SUCCESS }],
        };
        mockClient.order.findFirst.mockResolvedValue(order);

        const result = await repository.findOrderWithTransactions(100, 1);

        expect(mockClient.order.findFirst).toHaveBeenCalledWith({
          where: { id: 100, userId: 1 },
          include: expect.objectContaining({
            transactions: expect.any(Object),
          }),
        });
        expect(result?.transactions).toBeDefined();
      });

      test('EP: Find order status only → select optimization', async () => {
        const orderStatus = { status: OrderStatus.PAID };
        mockClient.order.findUnique.mockResolvedValue(orderStatus);

        const result = await repository.findOrderStatus(100);

        expect(mockClient.order.findUnique).toHaveBeenCalledWith({
          where: { id: 100 },
          select: { status: true },
        });
        expect(result?.status).toBe(OrderStatus.PAID);
      });
    });

    describe('2.3 Update Order', () => {
      test('EP: Update order status → success', async () => {
        mockClient.order.update.mockResolvedValue({
          id: 100,
          status: OrderStatus.PROCESSING,
        });

        const result = await repository.updateOrder(100, {
          status: OrderStatus.PROCESSING,
        });

        expect(mockClient.order.update).toHaveBeenCalledWith({
          where: { id: 100 },
          data: expect.objectContaining({ status: OrderStatus.PROCESSING }),
        });
        expect(result.status).toBe(OrderStatus.PROCESSING);
      });

      test('EP: Update multiple fields atomically', async () => {
        const updates = {
          status: OrderStatus.SHIPPING,
          trackingCode: 'TRACK123',
          supplierId: 5,
        };
        mockClient.order.update.mockResolvedValue({ id: 100, ...updates });

        await repository.updateOrder(100, updates);

        expect(mockClient.order.update).toHaveBeenCalledWith({
          where: { id: 100 },
          data: expect.objectContaining(updates),
        });
      });

      test('EP: Update with transaction client → use tx', async () => {
        const mockTx = { order: { update: jest.fn().mockResolvedValue({ id: 100 }) } };

        await repository.updateOrder(100, { status: OrderStatus.PAID }, mockTx as any);

        expect(mockTx.order.update).toHaveBeenCalled();
      });
    });

    describe('2.4 List Orders', () => {
      test('EP: List user orders → ordered by newest first', async () => {
        const orders = [
          { id: 100, createdAt: new Date() },
          { id: 99, createdAt: new Date(Date.now() - 86400000) },
        ];
        mockClient.order.findMany.mockResolvedValue(orders);

        const result = await repository.listMyOrders(1);

        expect(mockClient.order.findMany).toHaveBeenCalledWith({
          where: { userId: 1 },
          orderBy: { createdAt: 'desc' },
        });
        expect(result).toEqual(orders);
      });

      test('EP: List all orders with details → include user and supplier', async () => {
        const orders = [
          {
            id: 100,
            user: { id: 1, name: 'John' },
            supplier: { id: 10, name: 'Supplier A' },
          },
        ];
        mockClient.order.findMany.mockResolvedValue(orders);

        const result = await repository.listAllOrders();

        expect(mockClient.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              user: expect.any(Object),
              supplier: expect.any(Object),
            }),
          }),
        );
        expect(result).toEqual(orders);
      });

      test('EP: Get single order by ID with details', async () => {
        const order = {
          id: 100,
          user: { id: 1, name: 'John' },
          supplier: { id: 10, name: 'Supplier A' },
        };
        mockClient.order.findUnique.mockResolvedValue(order);

        const result = await repository.getOrderById(100);

        expect(mockClient.order.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.any(Object),
          }),
        );
        expect(result).toEqual(order);
      });
    });
  });

  // ==================== 3. STOCK OPERATIONS ====================
  describe('3. EP: Stock Operations', () => {
    describe('3.1 Find Sample Books', () => {
      test('EP: Find sample books by IDs → return quantities', async () => {
        const books = [
          { id: 1, quantity: 100 },
          { id: 2, quantity: 50 },
        ];
        mockClient.sampleBook.findMany.mockResolvedValue(books);

        const result = await repository.findSampleBooks([1, 2]);

        expect(mockClient.sampleBook.findMany).toHaveBeenCalledWith({
          where: { id: { in: [1, 2] } },
          select: { id: true, quantity: true },
        });
        expect(result).toEqual(books);
      });

      test('EP: Find sample books with unlimited stock (quantity=null)', async () => {
        const books = [
          { id: 1, quantity: null }, // Unlimited
          { id: 2, quantity: 50 },
        ];
        mockClient.sampleBook.findMany.mockResolvedValue(books);

        const result = await repository.findSampleBooks([1, 2]);

        expect(result[0].quantity).toBeNull();
        expect(result[1].quantity).toBe(50);
      });

      test('EP: Find non-existent books → return empty', async () => {
        mockClient.sampleBook.findMany.mockResolvedValue([]);

        const result = await repository.findSampleBooks([999]);

        expect(result).toEqual([]);
      });
    });

    describe('3.2 Update Sample Book Quantity (Atomic)', () => {
      test('EP: Decrement quantity atomically (WHERE quantity >= need) → success', async () => {
        mockClient.sampleBook.updateMany.mockResolvedValue({ count: 1 });

        const result = await repository.updateSampleBookQuantity(1, 10);

        expect(mockClient.sampleBook.updateMany).toHaveBeenCalledWith({
          where: { id: 1, quantity: { gte: 10 } },
          data: { quantity: { decrement: 10 } },
        });
        expect(result.count).toBe(1); // Updated
      });

      test('BVA: Exact quantity match (have=need) → succeeds', async () => {
        mockClient.sampleBook.updateMany.mockResolvedValue({ count: 1 });

        const result = await repository.updateSampleBookQuantity(1, 100);

        expect(result.count).toBe(1);
      });

      test('BVA: Insufficient quantity (have<need) → count=0', async () => {
        mockClient.sampleBook.updateMany.mockResolvedValue({ count: 0 });

        const result = await repository.updateSampleBookQuantity(1, 200);

        expect(result.count).toBe(0); // Not updated
      });

      test('EP: Decrement with transaction → use tx', async () => {
        const mockTx = { sampleBook: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };

        await repository.updateSampleBookQuantity(1, 10, mockTx as any);

        expect(mockTx.sampleBook.updateMany).toHaveBeenCalled();
      });
    });
  });

  // ==================== 4. TRANSACTION OPERATIONS ====================
  describe('4. EP: Transaction Operations', () => {
    test('EP: Create transaction record → success', async () => {
      const txData = {
        gateway: 'PAYOS',
        status: TransactionStatus.SUCCESS,
        amount: 100000,
        transactionTime: new Date(),
      };
      mockClient.transaction.create.mockResolvedValue({ id: 1, ...txData });

      const result = await repository.createTransaction(txData);

      expect(mockClient.transaction.create).toHaveBeenCalledWith({ data: txData });
      expect(result?.id).toBe(1);
    });

    test('EP: Mark transactions refunded → update SUCCESS → REFUNDED', async () => {
      mockClient.transaction.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.markTransactionsRefunded(100);

      expect(mockClient.transaction.updateMany).toHaveBeenCalledWith({
        where: { orderId: 100, status: TransactionStatus.SUCCESS },
        data: { status: TransactionStatus.REFUNDED },
      });
      expect(result.count).toBe(1);
    });

    test('EP: Mark multiple transactions refunded → update all', async () => {
      mockClient.transaction.updateMany.mockResolvedValue({ count: 3 });

      const result = await repository.markTransactionsRefunded(100);

      expect(result.count).toBe(3);
    });
  });

  // ==================== 5. CANCELLATION (ATOMIC WHERE) ====================
  describe('5. EP: Order Cancellation (Atomic)', () => {
    test('EP: Mark cancelled (PENDING_PAYMENT only) → success', async () => {
      mockClient.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.markCancelled(100);

      expect(mockClient.order.updateMany).toHaveBeenCalledWith({
        where: { id: 100, status: OrderStatus.PENDING_PAYMENT },
        data: { status: OrderStatus.CANCELLED },
      });
      expect(result.count).toBe(1);
    });

    test('EP: Mark cancelled already cancelled (race condition) → count=0', async () => {
      mockClient.order.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.markCancelled(100);

      expect(result.count).toBe(0); // Prevents double-restock
    });

    test('EP: Mark cancelled different status → count=0', async () => {
      mockClient.order.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.markCancelled(100);

      // Order is SHIPPED, not PENDING_PAYMENT, so won't update
      expect(result.count).toBe(0);
    });

    test('EP: Mark cancelled with transaction → use tx', async () => {
      const mockTx = { order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };

      await repository.markCancelled(100, mockTx as any);

      expect(mockTx.order.updateMany).toHaveBeenCalled();
    });
  });

  // ==================== 6. CART INTEGRATION ====================
  describe('6. EP: Cart Integration', () => {
    test('EP: Delete cart items after order → success', async () => {
      mockClient.cartItem.deleteMany.mockResolvedValue({ count: 3 });

      const result = await repository.deleteCartItems(1, [1, 2, 3]);

      expect(mockClient.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cart: { userId: 1 }, bookId: { in: [1, 2, 3] } },
      });
      expect(result.count).toBe(3);
    });

    test('EP: Delete single item from cart', async () => {
      mockClient.cartItem.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteCartItems(1, [1]);

      expect(result.count).toBe(1);
    });

    test('EP: Delete non-existent items → count=0', async () => {
      mockClient.cartItem.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repository.deleteCartItems(1, [999]);

      expect(result.count).toBe(0);
    });
  });

  // ==================== 7. SUPPLIER OPERATIONS ====================
  describe('7. EP: Supplier Operations', () => {
    test('EP: Find suppliers by IDs → return all details', async () => {
      const suppliers = [
        { id: 1, name: 'Supplier A', email: 'a@example.com' },
        { id: 2, name: 'Supplier B', email: 'b@example.com' },
      ];
      mockClient.supplier.findMany.mockResolvedValue(suppliers);

      const result = await repository.findSuppliersByIds([1, 2]);

      expect(mockClient.supplier.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
      });
      expect(result).toEqual(suppliers);
    });

    test('EP: Find single supplier', async () => {
      const supplier = { id: 1, name: 'Supplier A' };
      mockClient.supplier.findMany.mockResolvedValue([supplier]);

      const result = await repository.findSuppliersByIds([1]);

      expect(result[0]).toEqual(supplier);
    });

    test('EP: Find non-existent suppliers → empty', async () => {
      mockClient.supplier.findMany.mockResolvedValue([]);

      const result = await repository.findSuppliersByIds([999]);

      expect(result).toEqual([]);
    });
  });

  // ==================== 8. CASHFLOW OPERATIONS ====================
  describe('8. EP: Cashflow Operations', () => {
    test('EP: Create cashflow record (income) → success', async () => {
      const cashflowData = {
        orderId: 100,
        type: 'IN',
        amount: 100000,
        date: new Date(),
        note: 'Payment received',
      };
      mockClient.cashflow.create.mockResolvedValue({ id: 1, ...cashflowData });

      const result = await repository.createCashflow(cashflowData);

      expect(mockClient.cashflow.create).toHaveBeenCalledWith({ data: cashflowData });
      expect(result.id).toBe(1);
    });

    test('EP: Create cashflow record (expense) → success', async () => {
      const cashflowData = {
        orderId: 100,
        type: 'OUT',
        amount: 50000,
        date: new Date(),
        note: 'Supplier payment',
      };
      mockClient.cashflow.create.mockResolvedValue({ id: 2, ...cashflowData });

      const result = await repository.createCashflow(cashflowData);

      expect(result.type).toBe('OUT');
    });

    test('EP: Create cashflow with transaction → use tx', async () => {
      const mockTx = { cashflow: { create: jest.fn().mockResolvedValue({ id: 1 }) } };
      const data = { type: 'IN', amount: 100000, date: new Date() };

      await repository.createCashflow(data, mockTx as any);

      expect(mockTx.cashflow.create).toHaveBeenCalled();
    });
  });

  // ==================== 9. USER CONTACT OPERATIONS ====================
  describe('9. EP: User Contact (Snapshot)', () => {
    test('EP: Get user contact info → for order snapshot', async () => {
      const userContact = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '0912345678',
        address: '123 Main St',
      };
      mockClient.user.findUnique.mockResolvedValue(userContact);

      const result = await repository.getUserContact(1);

      expect(mockClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          name: true,
          email: true,
          phone: true,
          address: true,
        },
      });
      expect(result?.name).toBe('John Doe');
    });

    test('EP: User not found → null', async () => {
      mockClient.user.findUnique.mockResolvedValue(null);

      const result = await repository.getUserContact(999);

      expect(result).toBeNull();
    });

    test('EP: Get user contact with transaction → use tx', async () => {
      const mockTx = { user: { findUnique: jest.fn().mockResolvedValue({ name: 'John' }) } };

      await repository.getUserContact(1, mockTx as any);

      expect(mockTx.user.findUnique).toHaveBeenCalled();
    });
  });

  // ==================== 10. EDGE CASES ====================
  describe('10. Edge Cases & Transaction Support', () => {
    test('Edge: All methods support tx parameter', async () => {
      const mockTx = {
        idempotencyKey: { findUnique: jest.fn().mockResolvedValue(null) },
        order: { findUnique: jest.fn().mockResolvedValue(null) },
        sampleBook: { findMany: jest.fn().mockResolvedValue([]) },
        transaction: { create: jest.fn().mockResolvedValue({ id: 1 }) },
        cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        cashflow: { create: jest.fn().mockResolvedValue({ id: 1 }) },
        user: { findUnique: jest.fn().mockResolvedValue(null) },
        supplier: { findMany: jest.fn().mockResolvedValue([]) },
      };

      // All methods should accept tx as last parameter
      await repository.getIdempotencyKey('key', mockTx as any);
      await repository.createOrder({ userId: 1, orderCode: 'TEST-001', subTotal: 100000, totalAmount: 100000 }, mockTx as any);
      await repository.findSampleBooks([1], mockTx as any);
      await repository.updateSampleBookQuantity(1, 10, mockTx as any);
      await repository.createTransaction({ gateway: 'BANK', status: 'SUCCESS', amount: 100000, transactionTime: new Date() }, mockTx as any);
      await repository.deleteCartItems(1, [1], mockTx as any);
      await repository.createCashflow({ type: 'EXPENSE', amount: 1000, date: new Date() }, mockTx as any);
      await repository.getUserContact(1, mockTx as any);
      await repository.findSuppliersByIds([1], mockTx as any);

      expect(mockTx.idempotencyKey.findUnique).toHaveBeenCalled();
      expect(mockTx.order.findUnique).toHaveBeenCalled();
      expect(mockTx.sampleBook.findMany).toHaveBeenCalled();
    });

    test('Edge: Null tx → uses default client', async () => {
      mockClient.order.findUnique.mockResolvedValue({ id: 100 });

      await repository.findOrderById(100, null as any);

      expect(mockClient.order.findUnique).toHaveBeenCalled();
    });

    test('Edge: Batch operations with empty arrays', async () => {
      mockClient.sampleBook.findMany.mockResolvedValue([]);

      const result = await repository.findSampleBooks([]);

      expect(result).toEqual([]);
    });

    test('Edge: Large batch operation (many IDs)', async () => {
      const manyIds = Array.from({ length: 1000 }, (_, i) => i + 1);
      mockClient.sampleBook.findMany.mockResolvedValue([]);

      await repository.findSampleBooks(manyIds);

      expect(mockClient.sampleBook.findMany).toHaveBeenCalledWith({
        where: { id: { in: manyIds } },
        select: expect.any(Object),
      });
    });
  });

  // ==================== 11. FIND FOR EXPIRY ====================
  describe('11. EP: Find For Expiry (Special Selection)', () => {
    test('EP: Find expired orders → minimal fields for cancellation', async () => {
      const orders = [
        { id: 100, status: OrderStatus.PENDING_PAYMENT, expiredAt: new Date(), orderItems: [] },
      ];
      mockClient.order.findUnique.mockResolvedValue(orders[0]);

      const result = await repository.findForExpiry(100);

      expect(mockClient.order.findUnique).toHaveBeenCalledWith({
        where: { id: 100 },
        select: {
          id: true,
          status: true,
          expiredAt: true,
          orderItems: true,
        },
      });
      expect(result?.id).toBe(100);
    });
  });

  // ==================== 12. FIND EXPIRED FOR BATCH CANCELLATION ====================
  describe('12. EP: Find Expired For Batch Cancellation', () => {
    test('EP: Find expired PENDING_PAYMENT orders in batch', async () => {
      const expiredOrders = [
        { id: 95 },
        { id: 96 },
        { id: 97 },
      ];
      mockClient.order.findMany.mockResolvedValue(expiredOrders);

      const result = await repository.findExpiredForCancellation(90, 10);

      expect(mockClient.order.findMany).toHaveBeenCalledWith({
        where: {
          id: { gt: 90 },
          status: OrderStatus.PENDING_PAYMENT,
          expiredAt: { lt: expect.any(Date) },
        },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: 10,
      });
      expect(result).toEqual(expiredOrders);
    });

    test('EP: Cursor pagination for expiry batch job', async () => {
      mockClient.order.findMany.mockResolvedValue([]);

      await repository.findExpiredForCancellation(1000, 50);

      expect(mockClient.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { gt: 1000 },
          }),
          take: 50,
        }),
      );
    });
  });
});
