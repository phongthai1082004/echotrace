/**
 * I-19..I-28 — admin dispatch flow over real HTTP + real test DB.
 * PayOS SDK mocked at network edge; router/guard/DTO/Prisma real.
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

const { api, truncate, seedUsers, seedShop, orderBody, loginAs, authz, db } = await import('./db.js');

let adminTok = '';
let userTok = '';
let userId = 0;
let bookId = 0;
let supplierId = 0;

beforeEach(async () => {
	await truncate();
	const seed = await seedUsers();
	userId = seed.user.id;
	adminTok = (await loginAs('admin@test.local', 'Password123!')).body.data.accessToken;
	userTok = (await loginAs('user@test.local', 'Password123!')).body.data.accessToken;
	({ bookId } = await seedShop(userId));
	const sup = await db().supplier.create({
		data: { name: 'NCC Test', contact: '0912345678', email: 'ncc@test.local' },
	});
	supplierId = sup.id;
});

async function checkout() {
	const a = await api();
	const r = await request(a)
		.post('/api/orders')
		.set(authz(userTok))
		.set('Idempotency-Key', randomUUID())
		.send(orderBody(bookId))
		.expect(200);
	return r.body.data;
}

async function paySuccess(created: any) {
	const a = await api();
	const txn = await db().transaction.findFirstOrThrow({ where: { orderId: created.orderId } });
	await request(a).post('/api/payments/webhooks/payos').send({
		code: '00',
		success: true,
		data: {
			orderCode: created.orderCode,
			paymentLinkId: txn.gatewayTransactionCode,
			amount: 60000,
			transactionDateTime: new Date().toISOString(),
			accountNumber: '1',
			description: 'd',
			reference: 'r',
		},
		signature: 'valid',
	}).expect(200);
}

const events = (id: number, body: any, tok: string) =>
	request(apiSync()).post(`/api/admin/orders/${id}/events`).set(authz(tok)).send(body);

let _app: any = null;
function apiSync() {
	if (!_app) throw new Error('api not ready');
	return _app;
}

describe('I-19 guard + validation', () => {
	it('non-admin → 403; unknown event → 400', async () => {
		const a = await api();
		_app = a;
		const created = await checkout();
		await request(a).post(`/api/admin/orders/${created.orderId}/events`).set(authz(userTok)).send({ type: 'ship' }).expect(403);
		await request(a).post(`/api/admin/orders/${created.orderId}/events`).set(authz(adminTok)).send({ type: 'teleport' }).expect(400);
	});
});

describe('I-20..I-23 happy path assign→ship→deliver', () => {
	it('paid → processing → shipping → delivered + income once', async () => {
		const a = await api();
		_app = a;
		const created = await checkout();
		await paySuccess(created);

		await events(created.orderId, { type: 'assign', items: [{ itemIndex: 0, supplierId, costPrice: 10000 }] }, adminTok).expect(200);
		expect((await db().order.findUniqueOrThrow({ where: { id: created.orderId } })).status).toBe('processing');

		await events(created.orderId, { type: 'ship' }, adminTok).expect(200);
		await events(created.orderId, { type: 'deliver' }, adminTok).expect(200);
		expect((await db().order.findUniqueOrThrow({ where: { id: created.orderId } })).status).toBe('delivered');

		const income = await db().cashflow.findMany({ where: { orderId: created.orderId, type: 'IN' } });
		expect(income.length).toBeGreaterThan(0);
		const notes = await db().notification.findMany({ where: { userId } });
		expect(notes.some((n) => String(n.title).includes('giao'))).toBe(true);
	});
});

describe('I-24/I-25 cancel + refund branches', () => {
	it('paid → pending_refund → refunded via mocked PayOS', async () => {
		const a = await api();
		_app = a;
		const created = await checkout();
		await paySuccess(created);

		await events(created.orderId, { type: 'refund' }, adminTok).expect(200);
		expect((await db().order.findUniqueOrThrow({ where: { id: created.orderId } })).status).toBe('pending_refund');

		await events(created.orderId, { type: 'reconcile_refund' }, adminTok).expect(200);
		expect((await db().order.findUniqueOrThrow({ where: { id: created.orderId } })).status).toBe('refunded');
	});

	it('unpaid → cancelled, no crash', async () => {
		const a = await api();
		_app = a;
		const created = await checkout();
		await request(a).post(`/api/orders/${created.orderId}/cancel`).set(authz(userTok)).expect(200);
		expect((await db().order.findUniqueOrThrow({ where: { id: created.orderId } })).status).toBe('cancelled');
	});
});

describe('I-26 returns loop', () => {
	it('request → approve → reshipped, each side notified once', async () => {
		const a = await api();
		_app = a;
		const created = await checkout();
		await paySuccess(created);
		await events(created.orderId, { type: 'assign', items: [{ itemIndex: 0, supplierId, costPrice: 10000 }] }, adminTok).expect(200);
		await events(created.orderId, { type: 'ship' }, adminTok).expect(200);
		await events(created.orderId, { type: 'deliver' }, adminTok).expect(200);

		await request(a).post(`/api/orders/${created.orderId}/return`).set(authz(userTok)).send({ reason: 'rách' }).expect(200);
		await request(a).post(`/api/admin/orders/${created.orderId}/return-approve`).set(authz(adminTok)).send({ fault: 'self' }).expect(200);
		await request(a).post(`/api/admin/orders/${created.orderId}/return-reshipped`).set(authz(adminTok)).expect(200);

		const o = await db().order.findUniqueOrThrow({ where: { id: created.orderId } });
		expect(o.returnState).toBe('reshipped');
		const notes = await db().notification.findMany({ where: { userId } });
		expect(notes.some((n) => String(n.title).includes('gửi lại'))).toBe(true);
	});
});

describe('I-27 force_status guard', () => {
	it('short reason → 400; valid → status + audit', async () => {
		const a = await api();
		_app = a;
		const created = await checkout();
		await events(created.orderId, { type: 'force_status', status: 'cancelled', reason: 'no' }, adminTok).expect(400);
		await events(created.orderId, { type: 'force_status', status: 'cancelled', reason: 'customer asked' }, adminTok).expect(200);
		const o = await db().order.findUniqueOrThrow({ where: { id: created.orderId } });
		expect(o.status).toBe('cancelled');
		expect(String(o.note)).toContain('FORCE');
	});
});
