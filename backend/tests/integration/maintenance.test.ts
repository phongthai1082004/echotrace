/**
 * I-17/I-18 — maintenance middleware + windows API over real HTTP + DB.
 */
import request from 'supertest';
import { api, truncate, seedUsers, loginAs, authz } from './db.js';

let adminTok = '';

beforeEach(async () => {
	await truncate();
	await seedUsers();
	adminTok = (await loginAs('admin@test.local', 'Password123!')).body.data.accessToken;
});

describe('I-17/I-18 maintenance gate', () => {
	it('flag on → normal API 503 + Retry-After; allowlist passes; off → through', async () => {
		const a = await api();
		// off → through
		await request(a).get('/api/notifications').set(authz(adminTok)).expect(200);

		// on
		await request(a).post('/api/admin/maintenance').set(authz(adminTok)).send({ enabled: true }).expect(200);
		const blocked = await request(a).get('/api/notifications').set(authz(adminTok)).expect(503);
		expect(blocked.headers['retry-after']).toBeDefined();

		// allowlist: auth + admin + status pass
		await request(a).get('/api/maintenance/status').expect(200);
		await request(a).get('/api/admin/maintenance').set(authz(adminTok)).expect(200);

		// off again
		await request(a).post('/api/admin/maintenance').set(authz(adminTok)).send({ enabled: false }).expect(200);
		await request(a).get('/api/notifications').set(authz(adminTok)).expect(200);
	});

	it('health shallow + deep ready (real DB+redis)', async () => {
		const a = await api();
		await request(a).get('/health').expect(200);
		const ready = await request(a).get('/health/ready').expect(200);
		expect(ready.body.checks.postgres).toBe('ok');
	});

	it('I-33 windows API: schedule validation + history', async () => {
		const a = await api();
		const t0 = new Date(Date.now() + 3600000).toISOString();
		const t1 = new Date(Date.now() + 7200000).toISOString();
		await request(a).post('/api/admin/maintenance').set(authz(adminTok)).send({ startAt: t1, endAt: t0 }).expect(400);
		await request(a)
			.post('/api/admin/maintenance')
			.set(authz(adminTok))
			.send({ startAt: t0, endAt: t1, reason: 'db migrate' })
			.expect(200);
		const h = await request(a).get('/api/admin/maintenance').set(authz(adminTok)).expect(200);
		expect(h.body.data.history.length).toBeGreaterThan(0);
	});
});
