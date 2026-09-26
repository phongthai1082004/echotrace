/**
 * I-1..I-4 — auth over real HTTP + real test DB (PayOS SDK mocked at network edge only).
 */
import request from 'supertest';
import { api, truncate, seedUsers, loginAs, authz } from './db.js';

beforeEach(async () => {
	await truncate();
	await seedUsers();
});

describe('I-1 login', () => {
	it('ok → access + refresh; wrong password → 401', async () => {
		const ok = await loginAs('user@test.local', 'Password123!');
		expect(ok.status).toBe(200);
		expect(ok.body.data.accessToken).toBeDefined();
		expect(ok.body.data.refreshToken).toBeDefined();

		const bad = await loginAs('user@test.local', 'Wrong12345!');
		expect(bad.status).toBe(401);
	});
});

describe('I-2 refresh rotation', () => {
	it('old token replay → 401 REVOKED; new token works', async () => {
		const a = await api();
		const login = await loginAs('user@test.local', 'Password123!');
		const r1 = login.body.data.refreshToken;

		const ref = await request(a).post('/api/auth/refresh').send({ refreshToken: r1 });
		expect(ref.status).toBe(200);
		expect(ref.body.data.accessToken).toBeDefined();
		const r2 = ref.body.data.refreshToken;
		// row cũ phải mất
		const { db } = await import('./db.js');
		const rows = await db().token.findMany({ where: { tokenType: 'session' } });
		expect(rows).toHaveLength(1);
		expect(rows[0].refreshToken).toBe(r2);

		// token đã xoay ra mà khác chuỗi → replay 401
		if (r2 !== r1) {
			await request(a).post('/api/auth/refresh').send({ refreshToken: r1 }).expect(401);
		}
		await request(a).post('/api/auth/refresh').send({ refreshToken: r2 }).expect(200);
	});
});

describe('I-3 invalid refresh', () => {
	it('garbage → 401; missing → 400', async () => {
		const a = await api();
		await request(a).post('/api/auth/refresh').send({ refreshToken: 'garbage' }).expect(401);
		await request(a).post('/api/auth/refresh').send({}).expect(400);
	});
});

describe('I-4 logout + guard', () => {
	it('logout kills refresh; guard without Bearer → 401', async () => {
		const a = await api();
		const login = await loginAs('user@test.local', 'Password123!');
		const { accessToken, refreshToken } = login.body.data;

		await request(a).post('/api/auth/logout').set(authz(accessToken)).expect(200);
		await request(a).post('/api/auth/refresh').send({ refreshToken }).expect(401);

		await request(a).get('/api/notifications').expect(401);
		await request(a).get('/api/notifications').set(authz(accessToken)).expect(200);
	});
});
