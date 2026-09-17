/**
 * I-13..I-16 — notifications over real HTTP + real test DB.
 */
import request from 'supertest';
import { api, truncate, seedUsers, loginAs, authz, db } from './db.js';

let adminTok = '';
let userTok = '';

beforeEach(async () => {
	await truncate();
	await seedUsers();
	adminTok = (await loginAs('admin@test.local', 'Password123!')).body.data.accessToken;
	userTok = (await loginAs('user@test.local', 'Password123!')).body.data.accessToken;
});

const good = () => ({
	titleVi: 'Bảo trì đêm nay',
	titleEn: 'Maintenance tonight',
	messageVi: 'Shop nghỉ 2 tiếng',
	messageEn: 'Down for 2 hours',
});

describe('I-13 guard + validation', () => {
	it('non-admin → 403; bad body → 400', async () => {
		const a = await api();
		await request(a).post('/api/admin/notifications/broadcast').set(authz(userTok)).send(good()).expect(403);
		await request(a)
			.post('/api/admin/notifications/broadcast')
			.set(authz(adminTok))
			.send({ titleVi: 'ab', messageVi: 'x' })
			.expect(400);
	});
});

describe('I-14 admin broadcast writes i18n rows', () => {
	it('N rows, sendBy shop, 3 langs, no mail channel', async () => {
		const a = await api();
		const r = await request(a)
			.post('/api/admin/notifications/broadcast')
			.set(authz(adminTok))
			.send(good())
			.expect(200);
		expect(r.body.data.users).toBe(2);
		const rows = await db().notification.findMany();
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({ scope: 'broadcast', sendBy: 'shop' });
		expect(rows[0].channels).toEqual(expect.arrayContaining(['db', 'push']));
		expect(rows[0].channels).not.toContain('email');
		const i18n = rows[0].i18n as any;
		expect(i18n.title).toMatchObject({ vi: 'Bảo trì đêm nay', en: 'Maintenance tonight' });
		expect(i18n.message).toMatchObject({ vi: 'Shop nghỉ 2 tiếng', en: 'Down for 2 hours' });
	});
});

describe('I-15 read/unread ownership', () => {
	it("another user's id → 0 touched", async () => {
		const a = await api();
		await request(a).post('/api/admin/notifications/broadcast').set(authz(adminTok)).send(good()).expect(200);
		const adminRows = await db().notification.findMany({ where: { user: { email: 'admin@test.local' } } });
		const otherId = adminRows[0].id;
		// user tries to mark admin's notification
		const r = await request(a).patch(`/api/notifications/${otherId}/read`).set(authz(userTok)).expect(200);
		expect(r.body.data.marked).toBe(0);
		const u = await request(a).patch(`/api/notifications/${otherId}/unread`).set(authz(userTok)).expect(200);
		expect(u.body.data.marked).toBe(0);
		// own id works both ways
		const mine = (await db().notification.findMany({ where: { user: { email: 'user@test.local' } } }))[0];
		await request(a).patch(`/api/notifications/${mine.id}/read`).set(authz(userTok)).expect(200);
		const r2 = await request(a).patch(`/api/notifications/${mine.id}/unread`).set(authz(userTok)).expect(200);
		expect(r2.body.data.marked).toBe(1);
	});
});

describe('I-16 list pagination', () => {
	it('limit+1 contract over HTTP', async () => {
		const a = await api();
		await request(a).post('/api/admin/notifications/broadcast').set(authz(adminTok)).send(good()).expect(200);
		await request(a).post('/api/admin/notifications/broadcast').set(authz(adminTok)).send(good()).expect(200);
		await request(a).post('/api/admin/notifications/broadcast').set(authz(adminTok)).send(good()).expect(200);
		const page = await request(a).get('/api/notifications?limit=2').set(authz(userTok)).expect(200);
		expect(page.body.data).toHaveLength(2);
	});
});
