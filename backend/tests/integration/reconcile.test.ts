/**
 * I-22/I-23 leftovers + I-28 — reconcile_cod / reconcile_supplier / album order
 * over real HTTP + real test DB. PayOS SDK mocked at network edge.
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import { randomUUID } from 'crypto';

jest.unstable_mockModule('@payos/node', () => ({
	PayOS: class {
		paymentRequests = {
			create: async (d: any) => ({
				paymentLinkId: `pl-${d.orderCode}`,
				amount: d.amount,
				checkoutUrl: `https://pay.test/${d.orderCode}`,
				qrCode: `qr-${d.orderCode}`,
				accountNumber: '0123456789',
				bin: '970422',
				accountName: 'TEST',
				description: d.description,
			}),
			get: async () => ({ status: 'PENDING' }),
			cancel: async () => ({}),
		};
		webhooks = {
			verify: async (p: any) => {
				if (p?.signature !== 'valid') throw new Error('invalid signature');
				return p.data;
			},
		};
		constructor(_opts: any) {}
	},
}));

const { api, truncate, seedUsers, seedShop, orderBody, flushCache, loginAs, authz, db } = await import('./db.js');

let adminTok = '';
let userTok = '';
let userId = 0;
let adminId = 0;
let bookId = 0;
let supplierId = 0;

beforeEach(async () => {
	await truncate();
	await flushCache();
	const seed = await seedUsers();
	userId = seed.user.id;
	adminId = seed.admin.id;
	adminTok = (await loginAs('admin@test.local', 'Password123!')).body.data.accessToken;
	userTok = (await loginAs('user@test.local', 'Password123!')).body.data.accessToken;
	({ bookId } = await seedShop(userId));
	const sup = await db().supplier.create({
		data: { name: 'NCC Test', contact: '0912345678', email: 'ncc@test.local' },
	});
	supplierId = sup.id;
});

async function checkoutHalf() {
	const a = await api();
	const r = await request(a)
		.post('/api/orders')
		.set(authz(userTok))
		.set('Idempotency-Key', randomUUID())
		.send({ ...orderBody(bookId), paymentMethod: 'half-payment' })
		.expect(200);
	return r.body.data;
}

async function webhookPay(created: any, amount: number) {
	const a = await api();
	const txn = await db().transaction.findFirstOrThrow({ where: { orderId: created.orderId } });
	await request(a).post('/api/payments/webhooks/payos').send({
		code: '00',
		success: true,
		data: {
			orderCode: created.orderCode,
			paymentLinkId: txn.gatewayTransactionCode,
			amount,
			transactionDateTime: new Date().toISOString(),
			accountNumber: '1',
			description: 'd',
			reference: 'r',
		},
		signature: 'valid',
	}).expect(200);
}

const events = async (id: number, body: any) => {
	const a = await api();
	return request(a).post(`/api/admin/orders/${id}/events`).set(authz(adminTok)).send(body);
};

describe('I-22 reconcile_cod', () => {
	it('HALF deposit → deliver → reconcile writes Cashflow IN remainder once', async () => {
		const created = await checkoutHalf();
		expect(created.payNow).toBe(30000);
		await webhookPay(created, 30000);
		expect((await db().order.findUniqueOrThrow({ where: { id: created.orderId } })).status).toBe('partially_paid');

		await events(created.orderId, { type: 'assign', items: [{ itemIndex: 0, supplierId, costPrice: 10000 }] }).then((r) => expect(r.status).toBe(200));
		await events(created.orderId, { type: 'ship' }).then((r) => expect(r.status).toBe(200));
		await events(created.orderId, { type: 'deliver' }).then((r) => expect(r.status).toBe(200));

		await events(created.orderId, { type: 'reconcile_cod' }).then((r) => expect(r.status).toBe(200));
		const o = await db().order.findUniqueOrThrow({ where: { id: created.orderId } });
		expect(o.codReconciledAt).not.toBeNull();
		const cod = await db().cashflow.findMany({ where: { orderId: created.orderId, type: 'IN' } });
		const amounts = cod.map((c: any) => Number(c.amount));
		expect(amounts).toContain(30000);

		// second reconcile → no-op (no duplicate IN)
		await events(created.orderId, { type: 'reconcile_cod' }).then((r) => expect(r.status).toBe(200));
		expect((await db().cashflow.findMany({ where: { orderId: created.orderId, type: 'IN' } })).length).toBe(cod.length);
	});
});

describe('I-23 reconcile_supplier', () => {
	it('writes Expense(SUPPLIER) + Cashflow OUT, skips second run when reconciled', async () => {
		const a = await api();
		const r = await request(a)
			.post('/api/orders')
			.set(authz(userTok))
			.set('Idempotency-Key', randomUUID())
			.send(orderBody(bookId))
			.expect(200);
		const created = r.body.data;
		await webhookPay(created, 60000);
		await events(created.orderId, { type: 'assign', items: [{ itemIndex: 0, supplierId, costPrice: 10000 }] }).then((x) => expect(x.status).toBe(200));

		await events(created.orderId, { type: 'reconcile_supplier' }).then((x) => expect(x.status).toBe(200));
		const exp = await db().expense.findMany({ where: { orderId: created.orderId } });
		expect(exp.length).toBeGreaterThan(0);
		expect(exp[0].category).toBe('SUPPLIER');
	});
});

describe('I-28 album order (admin creates for customer)', () => {
	it('creates order + payment link; size from album dims, utm override stamped', async () => {
		const a = await api();
		const sample = await db().sampleBook.create({
			data: {
				createdBy: adminId,
				name: 'Album Cuoi',
				type: 'ALBUM',
				status: 'published',
				isActive: true,
				style: 's',
				font: 'f',
				cover: 'soft',
				paperWidth: 210,
				paperHeight: 297,
				quantity: 5,
			},
		});
		const r = await request(a)
			.post('/api/admin/orders/album')
			.set(authz(adminTok))
			.send({
				customerId: userId,
				sampleBookId: sample.id,
				quantity: 1,
				cover: 'soft',
				paper: 'matt',
				name: 'Nguyen Van A',
				phone: '0912345678',
				address: '123 Duong ABC',
				city: 'Ha Noi',
				paymentMethod: 'full-payment',
				utmSource: 'Instagram',
			})
			.expect(200);
		const o = await db().order.findUniqueOrThrow({ where: { id: r.body.data.orderId } });
		expect(o.status).toBe('pending_payment');
		expect(o.utmSource).toBe('instagram');
		expect(r.body.data.checkoutUrl).toContain('pay.test');
	});

	it('missing paper → 400 (admin must pick)', async () => {
		const a = await api();
		const sample = await db().sampleBook.create({
			data: {
				createdBy: adminId,
				name: 'Album Cuoi',
				type: 'ALBUM',
				status: 'published',
				isActive: true,
				style: 's',
				font: 'f',
				cover: 'soft',
				paperWidth: 210,
				paperHeight: 297,
				quantity: 5,
			},
		});
		await request(a)
			.post('/api/admin/orders/album')
			.set(authz(adminTok))
			.send({
				customerId: userId,
				sampleBookId: sample.id,
				quantity: 1,
				name: 'Nguyen Van A',
				phone: '0912345678',
				address: '123 Duong ABC',
				city: 'Ha Noi',
				paymentMethod: 'full-payment',
			})
			.expect(400);
	});
});
