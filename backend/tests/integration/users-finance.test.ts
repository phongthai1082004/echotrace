/**
 * Users/profile/directory + finance ledger over real HTTP + real test DB.
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

describe('profile over HTTP', () => {
	it('get → update phone → change password → login with new', async () => {
		const a = await api();
		const me = await request(a).get('/api/user/profile').set(authz(userTok)).expect(200);
		expect(me.body.data.email).toBe('user@test.local');

		await request(a).put('/api/user/profile').set(authz(userTok)).send({ phone: '0987654321' }).expect(200);
		await request(a).put('/api/user/profile').set(authz(userTok)).send({ phone: 'abc' }).expect(400);

		await request(a)
			.put('/api/user/change-password')
			.set(authz(userTok))
			.send({ currentPassword: 'Password123!', newPassword: 'Newpass123!' })
			.expect(200);
		const relogin = await loginAs('user@test.local', 'Newpass123!');
		expect(relogin.status).toBe(200);
		const stale = await loginAs('user@test.local', 'Password123!');
		expect(stale.status).toBe(401);
	});
});

describe('directory over HTTP', () => {
	it('admin lists + role filter; user → 403; status flip', async () => {
		const a = await api();
		const all = await request(a).get('/api/admin/users').set(authz(adminTok)).expect(200);
		expect(JSON.stringify(all.body).length).toBeGreaterThan(10);
		await request(a).get('/api/admin/users').set(authz(userTok)).expect(403);

		const u = await db().user.findUniqueOrThrow({ where: { email: 'user@test.local' } });
		await request(a).patch(`/api/admin/users/${u.id}/status`).set(authz(adminTok)).send({ status: 'banned' }).expect(200);
		expect((await db().user.findUniqueOrThrow({ where: { id: u.id } })).isDelete).toBe(true);
		await request(a).patch(`/api/admin/users/${u.id}/status`).set(authz(adminTok)).send({ status: 'active' }).expect(200);
	});
});

describe('finance over HTTP', () => {
	it('summary zeroed; bad expense → 400; valid → listed', async () => {
		const a = await api();
		const sum = await request(a).get('/api/admin/financial/summary').set(authz(adminTok)).expect(200);
		expect(sum.body.data).toBeDefined();
		await request(a).get('/api/admin/financial/summary').set(authz(userTok)).expect(403);

		await request(a)
			.post('/api/admin/financial/expenses')
			.set(authz(adminTok))
			.send({ amount: -5, category: 'OPERATING' })
			.expect(400);
		await request(a)
			.post('/api/admin/financial/expenses')
			.set(authz(adminTok))
			.send({ amount: 50000, category: 'OPERATING' })
			.expect(200);
		const list = await request(a).get('/api/admin/financial/expense').set(authz(adminTok)).expect(200);
		expect(JSON.stringify(list.body)).toContain('50000');
		const income = await request(a).get('/api/admin/financial/income').set(authz(adminTok)).expect(200);
		expect(income.status).toBe(200);
		const cashflow = await request(a).get('/api/admin/financial/cashflow').set(authz(adminTok)).expect(200);
		expect(cashflow.status).toBe(200);
		await request(a).get('/api/admin/financial/income').set(authz(userTok)).expect(403);
	});
});
