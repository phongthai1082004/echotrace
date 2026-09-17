/**
 * Books / sample-books / suppliers / print-options update+delete over real HTTP + DB.
 * (Creates covered in catalog.test.ts.)
 */
import request from 'supertest';

const { api, truncate, seedUsers, loginAs, authz, db } = await import('./db.js');

let adminTok = '';
let userTok = '';

beforeEach(async () => {
	await truncate();
	await seedUsers();
	adminTok = (await loginAs('admin@test.local', 'Password123!')).body.data.accessToken;
	userTok = (await loginAs('user@test.local', 'Password123!')).body.data.accessToken;
});

describe('books over HTTP', () => {
	it('create → read → update pages → delete; another user’s → 403', async () => {
		const a = await api();
		const created = await request(a)
			.post('/api/books')
			.set(authz(userTok))
			.send({ title: 'My Journal', style: 's', font: 'f', content: { pages: [{ index: 0 }] } })
			.expect(201);
		const id = created.body.data.id;
		expect(id).toBeDefined();

		await request(a).get(`/api/books/${id}`).set(authz(userTok)).expect(200);
		await request(a).post('/api/books').set(authz(userTok)).send({ title: 'No content' }).expect(400);

		await request(a)
			.patch(`/api/books/${id}/pages`)
			.set(authz(userTok))
			.send({ content: { pages: [{ index: 0 }, { index: 1 }] } })
			.expect(200);

		// admin cannot touch another user's book
		await request(a).get(`/api/books/${id}`).set(authz(adminTok)).expect(403);

		await request(a).delete(`/api/books/${id}`).set(authz(userTok)).expect(200);
		await request(a).get(`/api/books/${id}`).set(authz(userTok)).expect(404);
	});
});

describe('sample-books over HTTP', () => {
	it('create → publish → explore lists it', async () => {
		const a = await api();
		const created = await request(a)
			.post('/api/admin/sample-books')
			.set(authz(adminTok))
			.send({ name: 'Mau A', type: 'TEMPLATE', status: 'draft' })
			.expect(201);
		const id = created.body.data.id;

		await request(a)
			.patch(`/api/admin/sample-books/${id}/status`)
			.set(authz(adminTok))
			.send({ status: 'published' })
			.expect(200);

		const explore = await request(a).get('/api/explore/samples').set(authz(userTok)).expect(200);
		expect(JSON.stringify(explore.body)).toContain('Mau A');
		const albums = await request(a).get('/api/explore/albums').set(authz(userTok)).expect(200);
		expect(albums.status).toBe(200);
	});
});

describe('suppliers + print-options update/delete over HTTP', () => {
	it('update + soft-delete round trip', async () => {
		const a = await api();
		const sup = await request(a)
			.post('/api/admin/suppliers')
			.set(authz(adminTok))
			.send({ name: 'NCC X', contact: '0912345678', email: 'nccx@test.local' })
			.expect(200);
		const sid = sup.body.data.id;
		await request(a).patch(`/api/admin/suppliers/${sid}`).set(authz(adminTok)).send({ contact: '0987654321' }).expect(200);
		await request(a).delete(`/api/admin/suppliers/${sid}`).set(authz(adminTok)).expect(200);
		expect((await db().supplier.findUnique({ where: { id: sid } }))?.isDelete).toBe(true);

		const sup2 = await request(a)
			.post('/api/admin/suppliers')
			.set(authz(adminTok))
			.send({ name: 'NCC Y', contact: '0912345678', email: 'nccy@test.local' })
			.expect(200);
		const sid2 = sup2.body.data.id;
		await request(a).patch(`/api/admin/suppliers/${sid2}/info`).set(authz(adminTok)).send({ bankName: 'VCB' }).expect(200);
		expect((await db().supplier.findUniqueOrThrow({ where: { id: sid2 } })).bankName).toBe('VCB');
		await request(a).patch(`/api/admin/suppliers/${sid2}/options`).set(authz(adminTok)).send({ optionIds: [] }).expect(200);
		await request(a).get('/api/admin/supplier-options/catalog').set(authz(adminTok)).expect(200);
		await request(a).patch(`/api/admin/suppliers/${sid2}/status`).set(authz(adminTok)).send({ status: 'banned' }).expect(200);
		expect((await db().supplier.findUniqueOrThrow({ where: { id: sid2 } })).isDelete).toBe(true);

		const po = await request(a)
			.post('/api/admin/print-options')
			.set(authz(adminTok))
			.send({ type: 'paper', code: 'PX', name: { vi: 'G', en: 'P', es: 'P' }, price: 1000 })
			.expect(200);
		const pid = po.body.data.id;
		await request(a).patch(`/api/admin/print-options/${pid}`).set(authz(adminTok)).send({ price: 2000 }).expect(200);
		await request(a).delete(`/api/admin/print-options/${pid}`).set(authz(adminTok)).expect(200);
	});
});
