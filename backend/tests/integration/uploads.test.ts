/**
 * Uploads over real HTTP + real test DB. R2 worker + Resend stubbed at fetch
 * edge (unit covers service branching); router/guard/DTO/Prisma are real.
 */
import request from 'supertest';

const { api, truncate, seedUsers, loginAs, authz, db } = await import('./db.js');

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

describe('uploads over HTTP', () => {
	it('signature by type; save → get → list → delete (R2 stubbed)', async () => {
		const a = await api();
		const sig = await request(a).get('/api/get-upload-signature?type=gallery').set(authz(userTok)).expect(200);
		expect(JSON.stringify(sig.body)).toContain('gallery');

		const saved = await request(a)
			.post('/api/uploads/image')
			.set(authz(userTok))
			.send({ url: 'http://x/y.png', width: 100, height: 100 })
			.expect(201);
		const id = saved.body.data.id;
		expect(id).toBeDefined();

		const list = await request(a).get('/api/uploads/images').set(authz(userTok)).expect(200);
		expect(JSON.stringify(list.body)).toContain('y.png');

		await request(a).delete(`/api/uploads/images/${id}`).set(authz(userTok)).expect(200);
		expect((await db().userImage.findUnique({ where: { id } }))?.isDelete).toBe(true);
	});

	it('save without url → 400', async () => {
		const a = await api();
		await request(a).post('/api/uploads/image').set(authz(userTok)).send({}).expect(400);
	});
});
