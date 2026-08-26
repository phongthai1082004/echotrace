import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ponytail: unit test verifyPayment — control flow only, prisma + PayOS mocked.
const mocks = vi.hoisted(() => ({
  prisma: { order: { findFirst: vi.fn(), findUnique: vi.fn() } },
  getPaymentStatus: vi.fn(),
  processWebhook: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: mocks.prisma }));
vi.mock('../../infrastructure/payment/payment.service.js', () => ({ PaymentService: class {} }));
vi.mock('../../features/payment/payment.service.js', () => ({ PaymentWebhookService: class {} }));

import { OrderService } from './order.service.js';
import { OrderStatus, PaymentGateway } from '@echotrace/shared';

beforeEach(() => {
  vi.resetAllMocks();
});

const svc = new OrderService(
  {} as any,
  { getPaymentStatus: mocks.getPaymentStatus } as any,
  { processWebhook: mocks.processWebhook } as any,
);

const pendingOrder = (extra: any = {}) => ({
  id: 1,
  status: OrderStatus.PENDING_PAYMENT,
  orderCode: '123',
  totalAmount: 100,
  transactions: [{ gateway: PaymentGateway.PAYOS, gatewayTransactionCode: '123', amount: 100 }],
  ...extra,
});

describe('OrderService.verifyPayment', () => {
  it('throws 404 when order missing', async () => {
    mocks.prisma.order.findFirst.mockResolvedValueOnce(null);
    await expect(svc.verifyPayment(1, 1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns current status when not pending (no PayOS call)', async () => {
    mocks.prisma.order.findFirst.mockResolvedValueOnce(pendingOrder({ status: OrderStatus.PAID }));
    const r = await svc.verifyPayment(1, 1);
    expect(r).toBe(OrderStatus.PAID);
    expect(mocks.getPaymentStatus).not.toHaveBeenCalled();
  });

  it('does not process when PayOS not PAID', async () => {
    mocks.prisma.order.findFirst.mockResolvedValueOnce(pendingOrder());
    mocks.prisma.order.findUnique.mockResolvedValueOnce({ status: OrderStatus.PENDING_PAYMENT });
    mocks.getPaymentStatus.mockResolvedValueOnce('PENDING');
    const r = await svc.verifyPayment(1, 1);
    expect(r).toBe(OrderStatus.PENDING_PAYMENT);
    expect(mocks.processWebhook).not.toHaveBeenCalled();
  });

  it('runs webhook and returns updated status when PayOS PAID', async () => {
    mocks.prisma.order.findFirst.mockResolvedValueOnce(pendingOrder());
    mocks.prisma.order.findUnique.mockResolvedValueOnce({ status: OrderStatus.PAID });
    mocks.getPaymentStatus.mockResolvedValueOnce('PAID');
    const r = await svc.verifyPayment(1, 1);
    expect(mocks.processWebhook).toHaveBeenCalledTimes(1);
    expect(r).toBe(OrderStatus.PAID);
  });
});
