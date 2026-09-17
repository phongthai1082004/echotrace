/**
 * Coupons + cart over real HTTP + real test DB.
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

beforeEach(async () => {
	await truncate();
	const seed = await seedUsers();
	userId = seed.user.id;
	adminTok = (await loginAs('admin@test.local', 'Password123!')).body.data.accessToken;
	userTok = (await loginAs('user@test.local', 'Password123!')).body.data.accessToken;
	({ bookId } = await seedShop(userId));
});

describe('coupons over HTTP', () => {
	it('admin create → listed; bad body → 400; user → 403', async () => {
		const a = await api();
		const bad = await request(a)
			.post('/api/admin/coupons')
			.set(authz(adminTok))
			.send({ code: 'x', discountType: 'nope', discountValue: -1 })
			.expect(400);
		expect(bad.status).toBe(400);
		await request(a)
			.post('/api/admin/coupons')
			.set(authz(userTok))
			.send({ code: 'GIAM10', discountType: 'percentage', discountValue: 10 })
			.expect(403);
		const created = await request(a)
			.post('/api/admin/coupons')
			.set(authz(adminTok))
			.send({ code: 'GIAM10', discountType: 'percentage', discountValue: 10 })
			.expect(201);
		expect(created.body.data.code).toMatch(/^GIAM10/);
		const list = await request(a).get('/api/admin/coupons').set(authz(adminTok)).expect(200);
		expect(JSON.stringify(list.body)).toContain('GIAM10');
	});
});

describe('cart over HTTP + coupon checkout', () => {
	it('get/patch/delete item; calculate applies coupon; checkout totals discounted', async () => {
		const a = await api();
		// seeded cart has 1 item (60000) — CartDTO uses parsedItems
		const cart = await request(a).get('/api/cart').set(authz(userTok)).expect(200);
		expect(cart.body.data.parsedItems).toHaveLength(1);

		await request(a).patch(`/api/cart/item/${bookId}`).set(authz(userTok)).send({ quantity: 2 }).expect(200);
		const calc = await request(a).post('/api/cart/calculate').set(authz(userTok)).send({}).expect(200);
		expect(calc.body.data.subtotal).toBe(120000);

		// coupon end-to-end
		const created = await request(a)
			.post('/api/admin/coupons')
			.set(authz(adminTok))
			.send({ code: 'GIAM10', discountType: 'percentage', discountValue: 10 })
			.expect(201);
		const code: string = created.body.data.code;
		const withCoupon = await request(a)
			.post('/api/cart/calculate')
			.set(authz(userTok))
			.send({ couponCode: code })
			.expect(200);
		expect(withCoupon.body.data.discount).toBe(12000);
		expect(withCoupon.body.data.total).toBe(108000);

		const order = await request(a)
			.post('/api/orders')
			.set(authz(userTok))
			.set('Idempotency-Key', randomUUID())
			.send({ ...orderBody(bookId), couponCode: code })
			.expect(200);
		expect(order.body.data.total).toBe(108000);
		const saved = await db().order.findUniqueOrThrow({ where: { id: order.body.data.orderId } });
		expect(Number(saved.discountAmount)).toBe(12000);

		await request(a).delete(`/api/cart/item/${bookId}`).set(authz(userTok)).expect(200);
		const empty = await request(a).get('/api/cart').set(authz(userTok)).expect(200);
		expect(empty.body.data.parsedItems).toHaveLength(0);
	});

	it('cart album endpoint adds sample as item', async () => {
		const a = await api();
		const admin = await db().user.findFirstOrThrow({ where: { role: 'admin' } });
		const sample = await db().sampleBook.create({
			data: {
				createdBy: admin.id,
				name: 'Album T',
				type: 'ALBUM',
				status: 'published',
				isActive: true,
				style: 's',
				font: 'f',
				cover: 'soft',
				quantity: 5,
			},
		});
		const r = await request(a)
			.post('/api/cart/album')
			.set(authz(userTok))
			.send({ sampleBookId: sample.id, quantity: 1 })
			.expect(200);
		expect(r.body.data.item.bookId).toBeDefined();
	});
});
