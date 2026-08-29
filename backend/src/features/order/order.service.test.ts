import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ponytail: unit test verifyPayment — control flow only, prisma + PayOS mocked.
const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    idempotencyKey: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    order: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
  cartService: { calculateCart: vi.fn() },
  paymentService: { createPaymentLink: vi.fn() },
  getPaymentStatus: vi.fn(),
  processWebhook: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: mocks.prisma }));
// ponytail: PrismaService inject qua constructor → mock module này để không load prisma.js thật (env thiếu generated client).
vi.mock('../../../lib/db.service.js', () => ({ PrismaService: class { db: any; constructor(db: any) { this.db = db; } } }));
vi.mock('../../infrastructure/payment/payment.service.js', () => ({ PaymentService: class {} }));
vi.mock('../../features/payment/payment.service.js', () => ({ PaymentWebhookService: class {} }));

import { OrderService, __resetPayStatusCache } from './order.service.js';
import { OrderRepository } from './order.repository.js';
import { OrderStatus, PaymentGateway } from '@echotrace/shared';

beforeEach(() => {
  vi.resetAllMocks();
  __resetPayStatusCache();
  // ponytail: resetAllMocks wipes factory implementations; restore promise-returning stubs
  mocks.prisma.idempotencyKey.findUnique.mockReturnValue(Promise.resolve(null));
  mocks.prisma.idempotencyKey.create.mockReturnValue(Promise.resolve({}));
  mocks.prisma.idempotencyKey.delete.mockReturnValue(Promise.resolve({}));
  mocks.prisma.idempotencyKey.update.mockReturnValue(Promise.resolve({}));
  mocks.prisma.user.findUnique.mockReturnValue(Promise.resolve(null));
  mocks.prisma.order.findFirst.mockReturnValue(Promise.resolve(null));
  mocks.prisma.order.findUnique.mockReturnValue(Promise.resolve(null));
  mocks.prisma.$transaction.mockReturnValue(Promise.resolve([]));
});

const svc = new OrderService(
  {} as any,
  { getPaymentStatus: mocks.getPaymentStatus } as any,
  { processWebhook: mocks.processWebhook } as any,
  {} as any,
  { enqueue: vi.fn() } as any,
  new OrderRepository({ db: mocks.prisma } as any),
);

// ponytail: separate instance wired with cartService/paymentService mocks for createOrder
const svc2 = new OrderService(
  mocks.cartService as any,
  mocks.paymentService as any,
  { processWebhook: mocks.processWebhook } as any,
  {} as any,
  { enqueue: vi.fn() } as any,
  new OrderRepository({ db: mocks.prisma } as any),
);

const pendingOrder = (extra: any = {}) => ({
  id: 1,
  status: OrderStatus.PENDING_PAYMENT,
  orderCode: '123',
  totalAmount: 100,
  transactions: [{ gateway: PaymentGateway.PAYOS, gatewayTransactionCode: '123', amount: 100 }],
  ...extra,
});

const validBody = (overrides: any = {}) =>
  JSON.stringify({
    paymentMethod: 'FULL',
    items: [{ bookId: 1, quantity: 1, cover: 'c', paper: 'p', paperSize: 's' }],
    name: 'Nguyen Van A',
    phone: '0123456789', // 0 + 9 digits -> valid
    address: '123 Duong ABC',
    city: 'HCMC',
    ...overrides,
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

describe('OrderService.createOrder — idempotency branches', () => {
  const user = { name: 'U', email: 'u@x.com', phone: '0123456789', address: 'addr' };

  it('returns cached response when idempotency SUCCESS (no create)', async () => {
    mocks.prisma.$transaction.mockResolvedValue([{ status: 'SUCCESS', responseBody: { ok: true } }, user]);
    const r = await svc2.createOrder('k', '{}', 1);
    expect(r).toEqual({ ok: true });
    expect(mocks.prisma.idempotencyKey.create).not.toHaveBeenCalled();
  });

  it('throws 409 when idempotency PROCESSING', async () => {
    mocks.prisma.$transaction.mockResolvedValue([{ status: 'PROCESSING' }, user]);
    await expect(svc2.createOrder('k', '{}', 1)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('deletes FAILED idempotency then proceeds past validation', async () => {
    mocks.prisma.$transaction.mockResolvedValue([{ status: 'FAILED' }, user]);
    mocks.prisma.idempotencyKey.create.mockResolvedValue({});
    mocks.cartService.calculateCart.mockRejectedValue(new Error('REACHED_CALC'));
    await expect(svc2.createOrder('k', validBody(), 1)).rejects.toThrow('REACHED_CALC');
    expect(mocks.prisma.idempotencyKey.delete).toHaveBeenCalledWith({ where: { key: 'k' } });
  });
});

describe('OrderService.createOrder — customer validation (EP/BVA)', () => {
  const user = { name: 'U', email: 'u@x.com', phone: '0123456789', address: 'addr' };

  const expect400 = (body: string) =>
    expect(svc2.createOrder('k', body, 1)).rejects.toMatchObject({ statusCode: 400 });

  beforeEach(() => {
    mocks.prisma.$transaction.mockResolvedValue([null, user]);
    mocks.prisma.idempotencyKey.create.mockResolvedValue({});
  });

  it('rejects 400 when name shorter than 2 chars (EP: empty/invalid)', async () => {
    await expect400(validBody({ name: 'A' }));
  });

  it('rejects 400 when phone does not match /^0\\d{8,10}$/ (EP/BVA)', async () => {
    await expect400(validBody({ phone: '01234567' })); // 0 + 7 digits -> too short
  });

  it('rejects 400 when address shorter than 5 chars (EP)', async () => {
    await expect400(validBody({ address: 'abc' }));
  });

  it('rejects 400 when city shorter than 2 chars (EP)', async () => {
    await expect400(validBody({ city: 'H' }));
  });

  it('passes validation on valid customer and reaches cart calc (valid partition)', async () => {
    mocks.cartService.calculateCart.mockRejectedValue(new Error('REACHED_CALC'));
    await expect(svc2.createOrder('k', validBody(), 1)).rejects.toThrow('REACHED_CALC');
  });
});
