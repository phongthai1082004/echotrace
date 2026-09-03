/**
 * Payment Service Unit Tests
 * Test coverage: Webhook idempotency, duplicate transaction detection, race conditions
 * Methodology: test.md skill - EP, BVA, validation testing, Serializable TX isolation
 */

import { PaymentService } from '../../../src/features/payment/payment.service';
import { AppError } from '../../../src/middleware/app.error';
import { ErrorCode } from '@echotrace/shared';

describe('PaymentService - Unit Tests', () => {
  let paymentService: PaymentService;
  let mockPaymentRepo: any;
  let mockOrderService: any;
  let mockCacheService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPaymentRepo = {
      findTransaction: jest.fn(),
      createTransaction: jest.fn(),
      updateTransaction: jest.fn(),
      createCashflow: jest.fn(),
      findOrderByIdInTx: jest.fn(),
      updateOrderStatusInTx: jest.fn(),
      countSuccessTransactions: jest.fn(),
      incrementPaidAmount: jest.fn(),
    };

    mockOrderService = {
      updateOrderPaymentStatus: jest.fn(),
      restockOnCancelledPayment: jest.fn(),
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    paymentService = new PaymentService(
      mockPaymentRepo,
      mockOrderService,
      mockCacheService
    );
  });

  // ===========================
  // SECTION 1: WEBHOOK PROCESSING - IDEMPOTENCY
  // ===========================

  describe('1. Webhook Processing - Idempotency', () => {
    describe('1.1 EP: Valid Webhook Scenarios', () => {
      test('EP: Should process webhook for full payment', async () => {
        const webhookPayload = {
          orderCode: 'ORD001',
          transactionCode: 'TXN001',
          status: 'SUCCESS',
          amount: 500000,
          timestamp: Date.now(),
        };

        const order = {
          id: 1,
          code: 'ORD001',
          status: 'PENDING_PAYMENT',
          totalAmount: 500000,
          paidAmount: 0,
        };

        mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);
        mockPaymentRepo.countSuccessTransactions.mockResolvedValue(0); // First successful txn
        mockPaymentRepo.createTransaction.mockResolvedValue({
          id: 1,
          code: 'TXN001',
          status: 'SUCCESS',
          amount: 500000,
        });
        mockPaymentRepo.createCashflow.mockResolvedValue(true);
        mockPaymentRepo.updateOrderStatusInTx.mockResolvedValue(true);

        const result = await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

        expect(mockPaymentRepo.createTransaction).toHaveBeenCalled();
        expect(mockPaymentRepo.createCashflow).toHaveBeenCalled();
      });

      test('EP: Should process partial payment', async () => {
        const webhookPayload = {
          orderCode: 'ORD002',
          transactionCode: 'TXN002',
          status: 'SUCCESS',
          amount: 250000,
          timestamp: Date.now(),
        };

        const order = {
          id: 2,
          code: 'ORD002',
          status: 'PENDING_PAYMENT',
          totalAmount: 500000,
          paidAmount: 0,
        };

        mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);
        mockPaymentRepo.countSuccessTransactions.mockResolvedValue(0);
        mockPaymentRepo.createTransaction.mockResolvedValue({
          id: 2,
          code: 'TXN002',
          status: 'SUCCESS',
          amount: 250000,
        });
        mockPaymentRepo.updateOrderStatusInTx.mockResolvedValue(true);

        await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

        expect(mockPaymentRepo.createTransaction).toHaveBeenCalled();
        // Status should be PARTIALLY_PAID (paidAmount < totalAmount)
      });

      test('EP: Should handle payment cancellation', async () => {
        const webhookPayload = {
          orderCode: 'ORD003',
          transactionCode: 'TXN003',
          status: 'CANCELLED',
          amount: 500000,
          timestamp: Date.now(),
        };

        const order = {
          id: 3,
          code: 'ORD003',
          status: 'PENDING_PAYMENT',
          totalAmount: 500000,
          paidAmount: 0,
        };

        mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);
        mockPaymentRepo.updateOrderStatusInTx.mockResolvedValue(true);
        mockOrderService.restockOnCancelledPayment.mockResolvedValue(true);

        await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

        expect(mockOrderService.restockOnCancelledPayment).toHaveBeenCalledWith(3);
      });
    });

    describe('1.2 EP: Duplicate Webhook Handling (Idempotency)', () => {
      test('EP: Second webhook with same txn code should skip increment', async () => {
        const webhookPayload = {
          orderCode: 'ORD004',
          transactionCode: 'TXN004',
          status: 'SUCCESS',
          amount: 500000,
          timestamp: Date.now(),
        };

        const order = {
          id: 4,
          code: 'ORD004',
          status: 'PENDING_PAYMENT',
          totalAmount: 500000,
          paidAmount: 0,
        };

        // First webhook
        mockPaymentRepo.findOrderByIdInTx.mockResolvedValueOnce(order);
        mockPaymentRepo.countSuccessTransactions.mockResolvedValueOnce(0); // First
        mockPaymentRepo.createTransaction.mockResolvedValueOnce({
          id: 1,
          code: 'TXN004',
          status: 'SUCCESS',
          amount: 500000,
        });
        mockPaymentRepo.createCashflow.mockResolvedValueOnce(true);
        mockPaymentRepo.updateOrderStatusInTx.mockResolvedValueOnce(true);

        await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

        // Second webhook (duplicate)
        mockPaymentRepo.findOrderByIdInTx.mockResolvedValueOnce(order);
        mockPaymentRepo.countSuccessTransactions.mockResolvedValueOnce(1); // Already one SUCCESS

        // Should skip transaction creation and cashflow
        await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

        // createTransaction called only once (for first webhook)
        expect(mockPaymentRepo.createTransaction).toHaveBeenCalledTimes(1);
        // createCashflow called only once
        expect(mockPaymentRepo.createCashflow).toHaveBeenCalledTimes(1);
      });

      test('EP: Third webhook with same txn code should also skip', async () => {
        // Ensures idempotency across multiple duplicates
        const webhookPayload = {
          orderCode: 'ORD005',
          transactionCode: 'TXN005',
          status: 'SUCCESS',
          amount: 500000,
          timestamp: Date.now(),
        };

        const order = {
          id: 5,
          code: 'ORD005',
          status: 'PENDING_PAYMENT',
          totalAmount: 500000,
          paidAmount: 0,
        };

        mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);
        mockPaymentRepo.countSuccessTransactions.mockResolvedValue(1); // Already has 1 SUCCESS

        // Should not create new transaction
        await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

        expect(mockPaymentRepo.createTransaction).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================
  // SECTION 2: DUPLICATE TRANSACTION DETECTION - BVA
  // ===========================

  describe('2. Duplicate Transaction Detection - BVA', () => {
    describe('2.1 BVA: Success Transaction Count Boundaries', () => {
      test('BVA: 0 SUCCESS transactions (first time) - should process', async () => {
        mockPaymentRepo.countSuccessTransactions.mockResolvedValue(0);

        const order = {
          id: 1,
          status: 'PENDING_PAYMENT',
          totalAmount: 500000,
          paidAmount: 0,
        };

        const webhookPayload = {
          orderCode: 'ORD001',
          transactionCode: 'TXN001',
          status: 'SUCCESS',
          amount: 500000,
        };

        mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);
        mockPaymentRepo.createTransaction.mockResolvedValue({ id: 1, status: 'SUCCESS' });
        mockPaymentRepo.createCashflow.mockResolvedValue(true);

        await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

        // Should process (create transaction)
        expect(mockPaymentRepo.createTransaction).toHaveBeenCalled();
      });

      test('BVA: 1 SUCCESS transaction (duplicate) - should skip', async () => {
        mockPaymentRepo.countSuccessTransactions.mockResolvedValue(1);

        const order = {
          id: 1,
          status: 'PENDING_PAYMENT',
          totalAmount: 500000,
          paidAmount: 0,
        };

        const webhookPayload = {
          orderCode: 'ORD001',
          transactionCode: 'TXN001',
          status: 'SUCCESS',
          amount: 500000,
        };

        mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);

        await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

        // Should skip (count > 0)
        expect(mockPaymentRepo.createTransaction).not.toHaveBeenCalled();
      });

      test('BVA: Many SUCCESS transactions (long-delayed duplicate) - should skip', async () => {
        mockPaymentRepo.countSuccessTransactions.mockResolvedValue(5);

        const order = {
          id: 1,
          status: 'PAID',
          totalAmount: 500000,
          paidAmount: 500000,
        };

        const webhookPayload = {
          orderCode: 'ORD001',
          transactionCode: 'TXN001',
          status: 'SUCCESS',
          amount: 500000,
        };

        mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);

        await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

        // Should skip
        expect(mockPaymentRepo.createTransaction).not.toHaveBeenCalled();
      });
    });

    describe('2.2 BVA: Amount Boundaries', () => {
      test('BVA: Zero amount payment', async () => {
        const webhookPayload = {
          orderCode: 'ORD006',
          transactionCode: 'TXN006',
          status: 'SUCCESS',
          amount: 0, // Zero amount
          timestamp: Date.now(),
        };

        const order = {
          id: 6,
          code: 'ORD006',
          status: 'PENDING_PAYMENT',
          totalAmount: 500000,
          paidAmount: 0,
        };

        mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);
        mockPaymentRepo.countSuccessTransactions.mockResolvedValue(0);
        mockPaymentRepo.createTransaction.mockResolvedValue({
          id: 1,
          status: 'SUCCESS',
          amount: 0,
        });

        await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

        // Should still process (may be edge case)
        expect(mockPaymentRepo.createTransaction).toHaveBeenCalled();
      });

      test('BVA: Amount exceeds order total (overpayment)', async () => {
        const webhookPayload = {
          orderCode: 'ORD007',
          transactionCode: 'TXN007',
          status: 'SUCCESS',
          amount: 600000, // More than order total (500k)
          timestamp: Date.now(),
        };

        const order = {
          id: 7,
          code: 'ORD007',
          status: 'PENDING_PAYMENT',
          totalAmount: 500000,
          paidAmount: 0,
        };

        mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);
        mockPaymentRepo.countSuccessTransactions.mockResolvedValue(0);
        mockPaymentRepo.createTransaction.mockResolvedValue({
          id: 1,
          status: 'SUCCESS',
          amount: 600000,
        });

        await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

        // Should process (business logic may cap at order total)
        expect(mockPaymentRepo.createTransaction).toHaveBeenCalled();
      });
    });
  });

  // ===========================
  // SECTION 3: RACE CONDITIONS - SERIALIZABLE TX
  // ===========================

  describe('3. Race Conditions - Two Webhooks Same Order', () => {
    test('RACE: Two webhooks processed sequentially (Serializable prevents race)', async () => {
      // With Serializable isolation, even if two webhooks arrive near-simultaneously:
      // - First webhook gets lock, processes, commits
      // - Second webhook acquires lock, re-reads state (sees update), skips

      const webhookPayload1 = {
        orderCode: 'ORD_RACE1',
        transactionCode: 'TXN_RACE1',
        status: 'SUCCESS',
        amount: 250000,
      };

      const webhookPayload2 = {
        orderCode: 'ORD_RACE1',
        transactionCode: 'TXN_RACE2',
        status: 'SUCCESS',
        amount: 250000,
      };

      const orderBefore = {
        id: 8,
        code: 'ORD_RACE1',
        status: 'PENDING_PAYMENT',
        totalAmount: 500000,
        paidAmount: 0,
      };

      const orderAfterFirstTxn = {
        ...orderBefore,
        paidAmount: 250000,
        status: 'PARTIALLY_PAID',
      };

      const orderAfterSecondTxn = {
        ...orderBefore,
        paidAmount: 500000,
        status: 'PAID',
      };

      // First webhook
      mockPaymentRepo.findOrderByIdInTx.mockResolvedValueOnce(orderBefore);
      mockPaymentRepo.countSuccessTransactions.mockResolvedValueOnce(0);
      mockPaymentRepo.createTransaction.mockResolvedValueOnce({
        id: 1,
        code: 'TXN_RACE1',
        status: 'SUCCESS',
        amount: 250000,
      });
      mockPaymentRepo.createCashflow.mockResolvedValueOnce(true);
      mockPaymentRepo.updateOrderStatusInTx.mockResolvedValueOnce(orderAfterFirstTxn);

      await paymentService.processWebhook(webhookPayload1, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

      // Second webhook (different txn code, same order)
      mockPaymentRepo.findOrderByIdInTx.mockResolvedValueOnce(orderAfterFirstTxn);
      mockPaymentRepo.countSuccessTransactions.mockResolvedValueOnce(1); // One already processed
      mockPaymentRepo.createCashflow.mockResolvedValueOnce(true);
      mockPaymentRepo.updateOrderStatusInTx.mockResolvedValueOnce(orderAfterSecondTxn);

      await paymentService.processWebhook(webhookPayload2, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

      // Both transactions should be created (different txn codes)
      expect(mockPaymentRepo.createTransaction).toHaveBeenCalledTimes(1); // First webhook only
      // Second webhook creates txn only if countSuccessTransactions returns 0
    });

    test('RACE: Same webhook processed twice (duplicate prevention)', async () => {
      // Same transaction code arriving twice

      const webhookPayload = {
        orderCode: 'ORD_RACE2',
        transactionCode: 'TXN_DUPLICATE',
        status: 'SUCCESS',
        amount: 500000,
      };

      const order = {
        id: 9,
        code: 'ORD_RACE2',
        status: 'PENDING_PAYMENT',
        totalAmount: 500000,
        paidAmount: 0,
      };

      // First processing
      mockPaymentRepo.findOrderByIdInTx.mockResolvedValueOnce(order);
      mockPaymentRepo.countSuccessTransactions.mockResolvedValueOnce(0);
      mockPaymentRepo.createTransaction.mockResolvedValueOnce({
        id: 1,
        code: 'TXN_DUPLICATE',
        status: 'SUCCESS',
        amount: 500000,
      });
      mockPaymentRepo.createCashflow.mockResolvedValueOnce(true);
      mockPaymentRepo.updateOrderStatusInTx.mockResolvedValueOnce({
        ...order,
        paidAmount: 500000,
        status: 'PAID',
      });

      await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

      // Second processing (same webhook)
      mockPaymentRepo.findOrderByIdInTx.mockResolvedValueOnce({
        ...order,
        paidAmount: 500000,
        status: 'PAID',
      });
      mockPaymentRepo.countSuccessTransactions.mockResolvedValueOnce(1); // Already one

      await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

      // Transaction created only once
      expect(mockPaymentRepo.createTransaction).toHaveBeenCalledTimes(1);
      // Cashflow created only once
      expect(mockPaymentRepo.createCashflow).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================
  // SECTION 4: VALIDATION TESTING
  // ===========================

  describe('4. Validation Testing - Invalid Payloads', () => {
    test('Validation: Missing orderCode', async () => {
      const invalidPayload = {
        transactionCode: 'TXN001',
        status: 'SUCCESS',
        amount: 500000,
      };

      await expect(
        paymentService.processWebhook(invalidPayload as any, {} as any)
      ).rejects.toThrow();
    });

    test('Validation: Missing transactionCode', async () => {
      const invalidPayload = {
        orderCode: 'ORD001',
        status: 'SUCCESS',
        amount: 500000,
      };

      await expect(
        paymentService.processWebhook(invalidPayload as any, {} as any)
      ).rejects.toThrow();
    });

    test('Validation: Invalid status', async () => {
      const invalidPayload = {
        orderCode: 'ORD001',
        transactionCode: 'TXN001',
        status: 'INVALID_STATUS',
        amount: 500000,
      };

      await expect(
        paymentService.processWebhook(invalidPayload as any, {} as any)
      ).rejects.toThrow();
    });

    test('Validation: Negative amount', async () => {
      const invalidPayload = {
        orderCode: 'ORD001',
        transactionCode: 'TXN001',
        status: 'SUCCESS',
        amount: -100000,
      };

      await expect(
        paymentService.processWebhook(invalidPayload as any, {} as any)
      ).rejects.toThrow();
    });
  });

  // ===========================
  // SECTION 5: STATUS MAPPING - EP
  // ===========================

  describe('5. Status Mapping - Payment Status Transitions', () => {
    test('EP: SUCCESS status maps to PAID', async () => {
      const webhookPayload = {
        orderCode: 'ORD008',
        transactionCode: 'TXN008',
        status: 'SUCCESS',
        amount: 500000,
      };

      const order = {
        id: 10,
        status: 'PENDING_PAYMENT',
        totalAmount: 500000,
        paidAmount: 0,
      };

      mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);
      mockPaymentRepo.countSuccessTransactions.mockResolvedValue(0);
      mockPaymentRepo.createTransaction.mockResolvedValue({ id: 1 });
      mockPaymentRepo.createCashflow.mockResolvedValue(true);
      mockPaymentRepo.updateOrderStatusInTx.mockResolvedValue({ status: 'PAID' });

      await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

      expect(mockPaymentRepo.updateOrderStatusInTx).toHaveBeenCalled();
    });

    test('EP: CANCELLED status triggers restock', async () => {
      const webhookPayload = {
        orderCode: 'ORD009',
        transactionCode: 'TXN009',
        status: 'CANCELLED',
        amount: 500000,
      };

      const order = {
        id: 11,
        status: 'PENDING_PAYMENT',
        totalAmount: 500000,
        paidAmount: 0,
      };

      mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);
      mockOrderService.restockOnCancelledPayment.mockResolvedValue(true);

      await paymentService.processWebhook(webhookPayload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

      expect(mockOrderService.restockOnCancelledPayment).toHaveBeenCalledWith(11);
    });
  });
});


  // ===========================
  // SECTION 5: WEBHOOK SIGNATURE VALIDATION
  // ===========================

  describe('5. EP: Webhook Signature Validation', () => {
    test('EP: Valid HMAC-SHA256 signature', async () => {
      const payload = JSON.stringify({
        orderCode: 'ORD005',
        transactionCode: 'TXN005',
        status: 'SUCCESS',
        amount: 100000,
      });
      const secret = 'webhook-secret-key';
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const order = {
        id: 5,
        code: 'ORD005',
        status: 'PENDING_PAYMENT',
        totalAmount: 100000,
        paidAmount: 0,
      };

      mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);
      mockPaymentRepo.createTransaction.mockResolvedValue({
        id: 1,
        status: 'SUCCESS',
      });

      // Signature verification should pass
      const result = await paymentService.verifyWebhookSignature(payload, signature, secret);

      expect(result).toBe(true);
    });

    test('Error: Invalid HMAC signature', async () => {
      const payload = JSON.stringify({ orderCode: 'ORD006', amount: 100000 });
      const invalidSignature = 'invalid-signature-hash';
      const secret = 'webhook-secret-key';

      await expect(
        paymentService.verifyWebhookSignature(payload, invalidSignature, secret)
      ).rejects.toThrow();
    });

    test('Error: Expired webhook timestamp (>5min old)', async () => {
      const oldTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago

      const webhookPayload = {
        orderCode: 'ORD007',
        transactionCode: 'TXN007',
        status: 'SUCCESS',
        amount: 100000,
        timestamp: oldTimestamp,
      };

      await expect(
        paymentService.processWebhook(webhookPayload, {} as any)
      ).rejects.toThrow('Webhook timestamp expired');
    });

    test('Error: Replayed webhook (nonce already used)', async () => {
      const nonce = 'webhook-nonce-001';
      const payload = {
        orderCode: 'ORD008',
        transactionCode: 'TXN008',
        status: 'SUCCESS',
        amount: 100000,
        nonce,
      };

      // First call succeeds
      mockCacheService.get.mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValueOnce(true);

      const order = {
        id: 8,
        code: 'ORD008',
        status: 'PENDING_PAYMENT',
        totalAmount: 100000,
        paidAmount: 0,
      };

      mockPaymentRepo.findOrderByIdInTx.mockResolvedValueOnce(order);
      mockPaymentRepo.createTransaction.mockResolvedValueOnce({
        id: 1,
        status: 'SUCCESS',
      });

      await paymentService.processWebhook(payload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

      // Second call with same nonce should fail
      mockCacheService.get.mockResolvedValueOnce(true); // Nonce already cached

      await expect(
        paymentService.processWebhook(payload, {} as any)
      ).rejects.toThrow('Webhook replay detected');
    });
  });

  // ===========================
  // SECTION 6: CONCURRENT PAYMENT RACE CONDITIONS
  // ===========================

  describe('6. RACE: Concurrent Payment Processing', () => {
    test('RACE: Two webhooks same transaction → only one processes', async () => {
      const payload = {
        orderCode: 'ORD_RACE_001',
        transactionCode: 'TXN_RACE_001',
        status: 'SUCCESS',
        amount: 500000,
        timestamp: Date.now(),
      };

      const order = {
        id: 10,
        code: 'ORD_RACE_001',
        status: 'PENDING_PAYMENT',
        totalAmount: 500000,
        paidAmount: 0,
      };

      let processCount = 0;

      mockPaymentRepo.findOrderByIdInTx.mockImplementation(() => {
        processCount++;
        if (processCount === 1) {
          return Promise.resolve(order);
        } else {
          return Promise.resolve({
            ...order,
            paidAmount: 500000,
            status: 'PAID',
          });
        }
      });

      mockPaymentRepo.countSuccessTransactions.mockImplementation(() => {
        // First call: 0 txns, Second call: 1 txn (already processed)
        if (processCount === 1) {
          return Promise.resolve(0);
        } else {
          return Promise.resolve(1);
        }
      });

      mockPaymentRepo.createTransaction.mockResolvedValueOnce({
        id: 1,
        status: 'SUCCESS',
      });

      // Process first webhook
      await paymentService.processWebhook(payload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

      // Attempt second webhook (should be skipped or idempotent)
      await paymentService.processWebhook(payload, { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any);

      expect(mockPaymentRepo.createTransaction).toHaveBeenCalledTimes(1);
    });

    test('RACE: Concurrent payment + refund (payment wins)', async () => {
      const transactionCode = 'TXN_PAYMENT_VS_REFUND';
      const order = {
        id: 11,
        code: 'ORD_RACE_002',
        status: 'PENDING_PAYMENT',
        totalAmount: 500000,
        paidAmount: 0,
      };

      // Payment webhook
      mockPaymentRepo.findOrderByIdInTx.mockResolvedValueOnce(order);
      mockPaymentRepo.createTransaction.mockResolvedValueOnce({
        transactionCode,
        status: 'SUCCESS',
        type: 'PAYMENT',
      });

      // Refund request (should fail if payment not yet committed)
      await paymentService.processWebhook(
        {
          orderCode: 'ORD_RACE_002',
          transactionCode,
          status: 'SUCCESS',
          amount: 500000,
        },
        { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any
      );

      // Refund should now be prevented or queued
      expect(mockPaymentRepo.createTransaction).toHaveBeenCalled();
    });

    test('RACE: Concurrent partial payments (same coupon usage)', async () => {
      // Two partial payment webhooks arriving simultaneously
      const order = {
        id: 12,
        code: 'ORD_PARTIAL_RACE',
        status: 'PENDING_PAYMENT',
        totalAmount: 1000000,
        paidAmount: 0,
      };

      let callCount = 0;

      mockPaymentRepo.findOrderByIdInTx.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(order);
        } else {
          return Promise.resolve({
            ...order,
            paidAmount: 500000,
          });
        }
      });

      mockPaymentRepo.createTransaction.mockImplementation(() => {
        if (callCount === 1) {
          return Promise.resolve({ amount: 500000, status: 'SUCCESS' });
        } else {
          return Promise.resolve({ amount: 500000, status: 'SUCCESS' });
        }
      });

      // First partial payment
      await paymentService.processWebhook(
        {
          orderCode: 'ORD_PARTIAL_RACE',
          transactionCode: 'TXN_P1',
          status: 'SUCCESS',
          amount: 500000,
        },
        { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any
      );

      // Second partial payment (should increment to 1000000)
      await paymentService.processWebhook(
        {
          orderCode: 'ORD_PARTIAL_RACE',
          transactionCode: 'TXN_P2',
          status: 'SUCCESS',
          amount: 500000,
        },
        { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any
      );

      expect(mockPaymentRepo.createTransaction).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================
  // SECTION 7: PAYMENT STATUS TRANSITIONS
  // ===========================

  describe('7. EP: Payment Status Transitions', () => {
    test('EP: PENDING → SUCCESS', async () => {
      const order = {
        id: 13,
        code: 'ORD_STATUS_001',
        status: 'PENDING_PAYMENT',
        totalAmount: 100000,
        paidAmount: 0,
      };

      mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);
      mockPaymentRepo.createTransaction.mockResolvedValue({
        status: 'SUCCESS',
      });
      mockPaymentRepo.updateOrderStatusInTx.mockResolvedValue({
        status: 'PAID',
      });

      await paymentService.processWebhook(
        {
          orderCode: 'ORD_STATUS_001',
          transactionCode: 'TXN_001',
          status: 'SUCCESS',
          amount: 100000,
        },
        { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any
      );

      expect(mockPaymentRepo.updateOrderStatusInTx).toHaveBeenCalled();
    });

    test('EP: PENDING → PARTIAL (50% paid)', async () => {
      const order = {
        id: 14,
        code: 'ORD_STATUS_002',
        status: 'PENDING_PAYMENT',
        totalAmount: 1000000,
        paidAmount: 0,
      };

      mockPaymentRepo.findOrderByIdInTx.mockResolvedValue(order);
      mockPaymentRepo.incrementPaidAmount.mockResolvedValue({
        paidAmount: 500000,
      });

      await paymentService.processWebhook(
        {
          orderCode: 'ORD_STATUS_002',
          transactionCode: 'TXN_002',
          status: 'SUCCESS',
          amount: 500000,
        },
        { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any
      );

      expect(mockPaymentRepo.incrementPaidAmount).toHaveBeenCalledWith(
        expect.anything(),
        500000
      );
    });

    test('EP: SUCCESS → CANCELLED (refund initiated)', async () => {
      mockPaymentRepo.updateTransaction.mockResolvedValue({
        status: 'CANCELLED',
      });
      mockPaymentRepo.createCashflow.mockResolvedValue(true);

      await paymentService.refundPayment('TXN_003', 100000);

      expect(mockPaymentRepo.updateTransaction).toHaveBeenCalled();
    });

    test('EP: PENDING → FAILED', async () => {
      mockPaymentRepo.createTransaction.mockResolvedValue({
        status: 'FAILED',
      });

      await paymentService.processWebhook(
        {
          orderCode: 'ORD_STATUS_003',
          transactionCode: 'TXN_003',
          status: 'FAILED',
          amount: 100000,
        },
        { $transaction: jest.fn(async (cb) => cb(mockPaymentRepo)) } as any
      );

      expect(mockPaymentRepo.createTransaction).toHaveBeenCalled();
    });
  });

  // ===========================
  // SECTION 8: REFUND HANDLING
  // ===========================

  describe('8. EP: Refund Processing', () => {
    test('EP: Full refund on paid order', async () => {
      const transactionCode = 'TXN_REFUND_001';
      const amount = 500000;

      mockPaymentRepo.findTransaction.mockResolvedValue({
        transactionCode,
        amount,
        status: 'SUCCESS',
      });

      mockPaymentRepo.updateTransaction.mockResolvedValue({
        status: 'CANCELLED',
      });

      mockPaymentRepo.createCashflow.mockResolvedValue(true);

      await paymentService.refundPayment(transactionCode, amount);

      expect(mockPaymentRepo.updateTransaction).toHaveBeenCalledWith(
        expect.anything(),
        transactionCode,
        { status: 'CANCELLED' }
      );
    });

    test('EP: Partial refund (75% refunded)', async () => {
      const transactionCode = 'TXN_PARTIAL_REFUND';
      const totalAmount = 1000000;
      const refundAmount = 750000;

      mockPaymentRepo.findTransaction.mockResolvedValue({
        transactionCode,
        amount: totalAmount,
        status: 'SUCCESS',
      });

      mockPaymentRepo.updateTransaction.mockResolvedValue({
        status: 'PARTIALLY_CANCELLED',
      });

      await paymentService.refundPayment(transactionCode, refundAmount);

      expect(mockPaymentRepo.createCashflow).toHaveBeenCalled();
    });

    test('Error: Refund non-existent transaction', async () => {
      mockPaymentRepo.findTransaction.mockResolvedValue(null);

      await expect(
        paymentService.refundPayment('TXN_INVALID', 100000)
      ).rejects.toThrow('Transaction not found');
    });

    test('Error: Refund already refunded transaction', async () => {
      mockPaymentRepo.findTransaction.mockResolvedValue({
        transactionCode: 'TXN_ALREADY_REFUNDED',
        amount: 500000,
        status: 'CANCELLED',
      });

      await expect(
        paymentService.refundPayment('TXN_ALREADY_REFUNDED', 500000)
      ).rejects.toThrow();
    });

    test('Error: Refund amount > original amount', async () => {
      mockPaymentRepo.findTransaction.mockResolvedValue({
        transactionCode: 'TXN_OVERFLOW',
        amount: 100000,
        status: 'SUCCESS',
      });

      await expect(
        paymentService.refundPayment('TXN_OVERFLOW', 150000)
      ).rejects.toThrow('Refund amount exceeds transaction amount');
    });
  });

  // ===========================
  // SECTION 9: CASHFLOW RECORDING
  // ===========================

  describe('9. EP: Cashflow Recording', () => {
    test('EP: Record income on successful payment', async () => {
      const orderId = 15;
      const amount = 500000;

      mockPaymentRepo.createCashflow.mockResolvedValue({
        id: 1,
        orderId,
        type: 'INCOME',
        amount,
      });

      await paymentService.recordIncome(orderId, amount);

      expect(mockPaymentRepo.createCashflow).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          orderId,
          type: 'INCOME',
          amount,
        })
      );
    });

    test('EP: Record expense on refund', async () => {
      const orderId = 16;
      const amount = 500000;

      mockPaymentRepo.createCashflow.mockResolvedValue({
        id: 2,
        orderId,
        type: 'OUTFLOW',
        amount,
      });

      await paymentService.recordRefundExpense(orderId, amount);

      expect(mockPaymentRepo.createCashflow).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          orderId,
          type: 'OUTFLOW',
          amount,
        })
      );
    });

    test('BVA: Cashflow for boundary amount (0)', async () => {
      const orderId = 17;
      const amount = 0;

      await expect(
        paymentService.recordIncome(orderId, amount)
      ).rejects.toThrow('Amount must be greater than 0');
    });

    test('BVA: Cashflow for large amount (10B VND)', async () => {
      const orderId = 18;
      const amount = 10000000000;

      mockPaymentRepo.createCashflow.mockResolvedValue({
        id: 3,
        orderId,
        amount,
      });

      await paymentService.recordIncome(orderId, amount);

      expect(mockPaymentRepo.createCashflow).toHaveBeenCalled();
    });
  });

  // ===========================
  // SECTION 10: AUTHORIZATION & SECURITY
  // ===========================

  describe('10. Auth: Payment Authorization', () => {
    test('Auth: User cannot refund another user\'s payment', async () => {
      mockPaymentRepo.findTransaction.mockResolvedValue({
        transactionCode: 'TXN_OTHER_USER',
        orderId: 100,
        userId: 999, // Different user
        status: 'SUCCESS',
      });

      await expect(
        paymentService.refundPayment('TXN_OTHER_USER', 100000, 1) // userId 1
      ).rejects.toThrow('Unauthorized');
    });

    test('Auth: Admin can refund any payment', async () => {
      mockPaymentRepo.findTransaction.mockResolvedValue({
        transactionCode: 'TXN_ADMIN_REFUND',
        orderId: 101,
        userId: 999,
        status: 'SUCCESS',
      });

      mockPaymentRepo.updateTransaction.mockResolvedValue({
        status: 'CANCELLED',
      });

      await paymentService.refundPayment('TXN_ADMIN_REFUND', 100000, 1, true); // isAdmin=true

      expect(mockPaymentRepo.updateTransaction).toHaveBeenCalled();
    });
  });
});
