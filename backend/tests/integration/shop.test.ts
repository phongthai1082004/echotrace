/**
 * I-5..I-12 — checkout + webhook over real HTTP + real test DB.
 * PayOS SDK is mocked at the network edge; router/guard/DTO/Prisma are real.
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import { randomUUID } from 'crypto';

// ponytail: ESM không hoist jest.mock — mock SDK PayOS (biên mạng) trước khi
// db.ts kéo cả server/container lên (dynamic import sau mock).
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

const { api, truncate, seedUsers, loginAs, authz, db } = await import('./db.js');

let userTok = '';
let userId = 0;
let bookId = 0;

const N = (over = {}) => ({ vi: 'Giấy', en: 'Paper', es: 'Papel', ...over });

beforeEach(async () => {
	await truncate();
	const seed = await seedUsers();
	userId = seed.user.id;
	userTok = (await loginAs('user@test.local', 'Password123!')).body.data.accessToken;

	await db().printOption.createMany({
		data: [
			{ type: 'cover', code: 'soft', name: N(), price: 20000 },
			{ type: 'paper', code: 'matt', name: N(), price: 5000 },
			{ type: 'paperSize', code: 'A4', name: N(), width: 210, height: 297 },
		],
	});
	const book = await db().book.create({
		data: {
			userId,
			title: 'B',
			style: 's',
			font: 'f',
			cover: 'soft',
			content: { pages: Array.from({ length: 10 }, (_, i) => ({ index: i })) },
		},
	});
	bookId = book.id;
	// ponytail: calculateCart đọc CartItem (body items chỉ để lọc bookIds)
	const cart = await db().cart.create({ data: { userId } });
	await db().cartItem.create({
		data: { cartId: cart.id, bookId, quantity: 1, cover: 'soft', paper: 'matt', paperSize: 'A4' },
	});
});

const orderBody = () => ({
	items: [{ bookId, quantity: 1, cover: 'soft', paper: 'matt', paperSize: 'A4' }],
	name: 'Nguyen Van A',
	phone: '0912345678',
	address: '123 Duong ABC',
	city: 'Ha Noi',
	paymentMethod: 'full-payment',
});

describe('I-5..I-8 checkout', () => {
	it('creates order + txn + idempotency row; replay returns cached, 1 order', async () => {
		const a = await api();
		const key = randomUUID();
		const r = await request(a)
			.post('/api/orders')
			.set(authz(userTok))
			.set('Idempotency-Key', key)
			.send(orderBody())
			.expect(200);
		expect(r.body.data.orderId).toBeDefined();
		expect(r.body.data.checkoutUrl).toContain('pay.test');
		expect(r.body.data.total).toBe(60000);

		const orders = await db().order.findMany();
		expect(orders).toHaveLength(1);
		expect(orders[0].status).toBe('pending_payment');
		const txns = await db().transaction.findMany();
		expect(txns).toHaveLength(1);
		expect(txns[0].status).toBe('pending');

		const replay = await request(a)
			.post('/api/orders')
			.set(authz(userTok))
			.set('Idempotency-Key', key)
			.send(orderBody())
			.expect(200);
		expect(replay.body.data).toEqual(r.body.data);
		expect(await db().order.count()).toBe(1);
	});

	it('bad phone → 400, no order; missing key → 400', async () => {
		const a = await api();
		await request(a)
			.post('/api/orders')
			.set(authz(userTok))
			.set('Idempotency-Key', randomUUID())
			.send({ ...orderBody(), phone: '123' })
			.expect(400);
		expect(await db().order.count()).toBe(0);
		await request(a).post('/api/orders').set(authz(userTok)).send(orderBody()).expect(400);
	});
});

describe('I-9..I-12 webhook', () => {
	async function checkout() {
		const a = await api();
		const r = await request(a)
			.post('/api/orders')
			.set(authz(userTok))
			.set('Idempotency-Key', randomUUID())
			.send(orderBody())
			.expect(200);
		return r.body.data;
	}

	it('bad signature → 400, no write; SUCCESS → paid + income notified', async () => {
		const a = await api();
		const created = await checkout();
		const txn = await db().transaction.findFirstOrThrow();

		const bad = await request(a).post('/api/payments/webhooks/payos').send({
			code: '00',
			data: { orderCode: created.orderCode, paymentLinkId: txn.gatewayTransactionCode, amount: 60000 },
			signature: 'bogus',
		});
		expect(bad.status).toBe(400);
		expect((await db().transaction.findUniqueOrThrow({ where: { id: txn.id } })).status).toBe('pending');

		const good = await request(a).post('/api/payments/webhooks/payos').send({
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
		});
		expect(good.status).toBe(200);
		expect((await db().order.findUniqueOrThrow({ where: { id: created.orderId } })).status).toBe('paid');
		// duplicate → still paid once, no crash
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
		const notes = await db().notification.findMany({ where: { userId } });
		expect(notes.length).toBeGreaterThan(0);
		const i18n = (notes.find((n) => n.type === 'payment')?.i18n ?? notes[0].i18n) as any;
		expect(i18n?.title?.vi).toBeDefined();
	});
});
