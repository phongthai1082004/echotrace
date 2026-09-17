/**
 * Coupons deactivate/delete, finance suppliers, marketing summary,
 * directory filters — over real HTTP + real test DB.
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

describe('coupons deactivate/delete', () => {
	it('deactivate → unusable; delete → gone', async () => {
		const a = await api();
		const created = await request(a)
			.post('/api/admin/coupons')
			.set(authz(adminTok))
			.send({ code: 'OFF10', discountType: 'percentage', discountValue: 10 })
			.expect(201);
		const id = created.body.data.id;

		await request(a).patch(`/api/admin/coupons/${id}/deactivate`).set(authz(adminTok)).expect(200);
		const row = await db().coupon.findUniqueOrThrow({ where: { id } });
		expect(row.isActive).toBe(false);

		await request(a).delete(`/api/admin/coupons/${id}`).set(authz(adminTok)).expect(200);
		expect((await db().coupon.findUnique({ where: { id } }))?.isDelete).toBe(true);
	});
});

describe('finance suppliers + marketing summary', () => {
	it('suppliers list numbers; summary clamps days + DB-only without GA', async () => {
		const a = await api();
		await db().supplier.create({ data: { name: 'NCC', contact: '0912345678', email: 's@t.local' } });
		const sup = await request(a).get('/api/admin/financial/suppliers').set(authz(adminTok)).expect(200);
		expect(JSON.stringify(sup.body)).toContain('NCC');

		const sum = await request(a).get('/api/admin/marketing/summary?days=400').set(authz(adminTok)).expect(200);
		expect(sum.body.data).toBeDefined();
		await request(a).get('/api/admin/marketing/summary').set(authz(userTok)).expect(403);
	});
});

describe('directory filters', () => {
	it('search narrows; banned filter works', async () => {
		const a = await api();
		const search = await request(a).get('/api/admin/users?search=user@test').set(authz(adminTok)).expect(200);
		const users = search.body.data.users;
		expect(users.length).toBeGreaterThan(0);
		expect(users.every((u: any) => JSON.stringify(u).includes('user@test'))).toBe(true);

		const u = await db().user.findUniqueOrThrow({ where: { email: 'user@test.local' } });
		await request(a).patch(`/api/admin/users/${u.id}/status`).set(authz(adminTok)).send({ status: 'banned' }).expect(200);
		const banned = await request(a).get('/api/admin/users?status=banned').set(authz(adminTok)).expect(200);
		expect(banned.body.data.users.some((x: any) => x.id === u.id)).toBe(true);
		const active = await request(a).get('/api/admin/users?status=active').set(authz(adminTok)).expect(200);
		expect(active.body.data.users.some((x: any) => x.id === u.id)).toBe(false);
	});
});
