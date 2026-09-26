/**
 * I-29..I-32, I-34 — admin catalog over real HTTP + real test DB.
 */
import request from 'supertest';
import { api, truncate, seedUsers, loginAs, authz, db } from './db.js';

const realFetch = globalThis.fetch;
beforeAll(() => {
	globalThis.fetch = (async (url: any, init: any) => {
		const u = String(url);
		if (u.includes('r2') || u.includes('resend')) return new Response('{}', { status: 200 });
		return realFetch(url, init);
	}) as any;
});
afterAll(() => {
	globalThis.fetch = realFetch;
});

let adminTok = '';
let userTok = '';

beforeEach(async () => {
	await truncate();
	await seedUsers();
	adminTok = (await loginAs('admin@test.local', 'Password123!')).body.data.accessToken;
	userTok = (await loginAs('user@test.local', 'Password123!')).body.data.accessToken;
});

describe('I-29 guard', () => {
	it('non-admin CRUD → 403', async () => {
		const a = await api();
		await request(a).post('/api/admin/stickers').set(authz(userTok)).send({ url: 'http://x/y.png' }).expect(403);
		await request(a)
			.post('/api/admin/print-options')
			.set(authz(userTok))
			.send({ type: 'paper', code: 'P1', name: { vi: 'G', en: 'P', es: 'P' } })
			.expect(403);
		await request(a)
			.post('/api/admin/suppliers')
			.set(authz(userTok))
			.send({ name: 'NCC', contact: '0912345678' })
			.expect(403);
	});
});

describe('I-30 stickers', () => {
	it('missing url → 400; bad category → 400; ok → 201', async () => {
		const a = await api();
		await request(a).post('/api/admin/stickers').set(authz(adminTok)).send({}).expect(400);
		await request(a)
			.post('/api/admin/stickers')
			.set(authz(adminTok))
			.send({ url: 'http://x/y.png', category: 'nope' })
			.expect(400);
		const ok = await request(a)
			.post('/api/admin/stickers')
			.set(authz(adminTok))
			.send({ url: 'http://x/y.png', category: 'travel' })
			.expect(201);
		expect(ok.body.data.id).toBeDefined();
		const list = await request(a).get('/api/admin/stickers').set(authz(adminTok)).expect(200);
		expect(list.body.data.length).toBeGreaterThan(0);
	});

	it('delete with publicId → R2 stubbed, soft-deleted', async () => {
		const a = await api();
		const created = await request(a)
			.post('/api/admin/stickers')
			.set(authz(adminTok))
			.send({ url: 'http://x/r2.png', category: 'travel', publicId: 'r2/abc' })
			.expect(201);
		const id = created.body.data.id;
		await request(a).delete(`/api/admin/stickers/${id}`).set(authz(adminTok)).expect(200);
		expect(await db().decorAsset.findUnique({ where: { id } })).toBeNull();
	});
});

describe('I-31 print-options', () => {
	it('duplicate code → 409; unknown id → 404', async () => {
		const a = await api();
		const good = { type: 'paper', code: 'P1', name: { vi: 'Giấy', en: 'Paper', es: 'Papel' }, width: 100, price: 5000 };
		await request(a).post('/api/admin/print-options').set(authz(adminTok)).send(good).expect(200);
		await request(a).post('/api/admin/print-options').set(authz(adminTok)).send(good).expect(409);
		await request(a).patch('/api/admin/print-options/99999').set(authz(adminTok)).send({ price: 1 }).expect(404);
	});
});

describe('I-32 suppliers', () => {
	it('bad phone → 400; ok → row + list', async () => {
		const a = await api();
		await request(a)
			.post('/api/admin/suppliers')
			.set(authz(adminTok))
			.send({ name: 'NCC Hoa Sen', contact: 'abc' })
			.expect(400);
		await request(a)
			.post('/api/admin/suppliers')
			.set(authz(adminTok))
			.send({ name: 'NCC Hoa Sen', contact: '0912345678', email: 'ncc@hoasen.vn' })
			.expect(200);
		const row = await db().supplier.findFirst({ where: { name: 'NCC Hoa Sen' } });
		expect(row).not.toBeNull();
	});
});

describe('I-34 upload signature', () => {
	it('known type → folder; save without url → 400', async () => {
		const a = await api();
		const sig = await request(a).get('/api/get-upload-signature?type=sticker').set(authz(adminTok)).expect(200);
		expect(JSON.stringify(sig.body)).toContain('sticker');
		await request(a).post('/api/uploads/image').set(authz(adminTok)).send({}).expect(400);
	});
});
