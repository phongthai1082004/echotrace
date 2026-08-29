import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ponytail: unit test PaymentWebhookService.processWebhook — control flow only, prisma + PayOS + email mocked.
const mocks = vi.hoisted(() => ({
	transaction: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
	order: { findUnique: vi.fn(), update: vi.fn() },
	cashflow: { findFirst: vi.fn(), create: vi.fn() },
	$transaction: vi.fn(),
	restock: vi.fn(),
	emailSend: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: mocks }));
vi.mock('../sample-books/stock.service.js', () => ({ restockOrderAlbums: mocks.restock }));
vi.mock('../email/email.service.js', () => ({ EmailService: class {} }));

import { PaymentWebhookService } from './payment.service.js';
import { PaymentWebhookRepository } from './payment.repository.js';
import { OrderStatus, TransactionStatus } from '@echotrace/shared';

const baseResult = (over: any = {}) => ({
	orderCode: '123',
	gateway: 'PAYOS',
	gatewayTransactionCode: 'GT123',
	amount: 100,
	status: TransactionStatus.SUCCESS,
	transactionTime: new Date(),
	rawPayload: {},
	isValidSignature: true,
	...over,
});

const pendingTxn = { id: 1, status: TransactionStatus.PENDING, orderId: 10, reference: 'ref' };

let svc: PaymentWebhookService;

beforeEach(() => {
	vi.resetAllMocks();
	mocks.$transaction.mockImplementation(async (cb: any) => cb({ transaction: mocks.transaction, order: mocks.order, cashflow: mocks.cashflow }));
	mocks.restock.mockResolvedValue(undefined);
	mocks.emailSend.mockResolvedValue(undefined);
	svc = new PaymentWebhookService({ send: mocks.emailSend } as any, new PaymentWebhookRepository({ db: mocks } as any));
});

describe('PaymentWebhookService.processWebhook', () => {
	it('marks order PAID (full) on first SUCCESS, writes Cashflow + email', async () => {
		mocks.transaction.findUnique.mockResolvedValue(pendingTxn);
		mocks.transaction.count.mockResolvedValue(0);
		mocks.order.findUnique.mockResolvedValue({
			id: 10,
			status: OrderStatus.PENDING_PAYMENT,
			paidAmount: 0,
			totalAmount: 100,
			orderCode: '123',
			user: { email: 'a@b.c', name: 'A' },
		});
		mocks.cashflow.findFirst.mockResolvedValue(null);

		await svc.processWebhook(baseResult({ amount: 100 }) as any);

		expect(mocks.transaction.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ status: TransactionStatus.SUCCESS }) }),
		);
		expect(mocks.order.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { paidAmount: 100, status: OrderStatus.PAID } });
		expect(mocks.cashflow.create).toHaveBeenCalledTimes(1);
		expect(mocks.emailSend).toHaveBeenCalledTimes(1);
	});

	it('is idempotent on PayOS retry (txn already SUCCESS) — no order update, no email', async () => {
		mocks.transaction.findUnique.mockResolvedValue({ ...pendingTxn, status: TransactionStatus.SUCCESS });

		await svc.processWebhook(baseResult() as any);

		expect(mocks.order.update).not.toHaveBeenCalled();
		expect(mocks.cashflow.create).not.toHaveBeenCalled();
		expect(mocks.emailSend).not.toHaveBeenCalled();
	});

	it('blocks double-count when another SUCCESS transaction exists', async () => {
		mocks.transaction.findUnique.mockResolvedValue(pendingTxn);
		mocks.transaction.count.mockResolvedValue(1); // another successful txn already recorded
		mocks.order.findUnique.mockResolvedValue({
			id: 10,
			status: OrderStatus.PENDING_PAYMENT,
			paidAmount: 0,
			totalAmount: 100,
			orderCode: '123',
			user: { email: 'a@b.c' },
		});

		await svc.processWebhook(baseResult() as any);

		// txn still flipped to SUCCESS, but order/income untouched
		expect(mocks.transaction.update).toHaveBeenCalledTimes(1);
		expect(mocks.order.update).not.toHaveBeenCalled();
		expect(mocks.cashflow.create).not.toHaveBeenCalled();
		expect(mocks.emailSend).not.toHaveBeenCalled();
	});

	it('restocks + cancels on CANCELLED webhook while PENDING_PAYMENT', async () => {
		mocks.transaction.findUnique.mockResolvedValue(pendingTxn);
		mocks.order.findUnique
			.mockResolvedValueOnce({ id: 10, status: OrderStatus.PENDING_PAYMENT, paidAmount: 0, totalAmount: 100, orderCode: '123', user: null })
			.mockResolvedValueOnce({ orderItems: [{ bookId: 1, quantity: 2 }] });

		await svc.processWebhook(baseResult({ status: TransactionStatus.CANCELLED }) as any);

		expect(mocks.restock).toHaveBeenCalledTimes(1);
		expect(mocks.order.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { status: OrderStatus.CANCELLED } });
	});

	it('does not revive an already CANCELLED order on late SUCCESS webhook', async () => {
		mocks.transaction.findUnique.mockResolvedValue(pendingTxn);
		mocks.order.findUnique.mockResolvedValue({ id: 10, status: OrderStatus.CANCELLED, paidAmount: 0, totalAmount: 100, orderCode: '123', user: null });

		await svc.processWebhook(baseResult() as any);

		expect(mocks.order.update).not.toHaveBeenCalled();
		expect(mocks.restock).not.toHaveBeenCalled();
		expect(mocks.emailSend).not.toHaveBeenCalled();
	});
});
