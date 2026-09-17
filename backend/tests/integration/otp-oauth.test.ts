/**
 * OTP + OAuth over real HTTP + real test DB (Google SDK mocked at network edge).
 * OTP happy path: code is bcrypt-hashed at rest, so the test swaps in a known
 * hash (simulating "user received 123456") — generation + mail delivery stubbed,
 * compare/revoke/register paths are real.
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';

jest.unstable_mockModule('google-auth-library', () => ({
	OAuth2Client: class {
		constructor(_id: any) {}
		verifyIdToken = async ({ idToken }: any) => {
			if (idToken === 'good')
				return { getPayload: () => ({ email: 'g@test.local', sub: 'g123', name: 'G', picture: null }) };
			if (idToken === 'noemail') return { getPayload: () => ({}) };
			throw new Error('bad token');
		};
	},
}));

const { api, truncate, seedUsers, loginAs, authz, db } = await import('./db.js');

let ip = 100;
const freshIp = () => ({ 'X-Forwarded-For': `10.8.0.${(ip++ % 200) + 5}` });

beforeEach(async () => {
	await truncate();
	await seedUsers();
});

describe('OTP over HTTP', () => {
	it('send → verify wrong → 400; no request → 400; happy path → 201 + user + login works', async () => {
		const a = await api();
		await request(a).post('/api/auth/send-otp').set(freshIp()).send({ email: 'new@test.local' }).expect(200);
		await request(a).post('/api/auth/send-otp').set(freshIp()).send({ email: 'bad' }).expect(400);

		// wrong code
		await request(a)
			.post('/api/auth/verify-otp')
			.set(freshIp())
			.send({ email: 'new@test.local', otp: '000000', password: 'Password123!' })
			.expect(400);

		// swap in known hash (user "received" 123456)
		const row = await db().token.findFirstOrThrow({ where: { email: 'new@test.local' } });
		await db().token.update({ where: { id: row.id }, data: { refreshToken: await bcrypt.hash('123456', 4) } });

		const ok = await request(a)
			.post('/api/auth/verify-otp')
			.set(freshIp())
			.send({ email: 'new@test.local', otp: '123456', password: 'Password123!' })
			.expect(201);
		expect(ok.body.data.accessToken).toBeDefined();

		const login = await loginAs('new@test.local', 'Password123!');
		expect(login.status).toBe(200);
	});

	it('5 wrong attempts → revoked (brute-force guard)', async () => {
		const a = await api();
		await request(a).post('/api/auth/send-otp').set(freshIp()).send({ email: 'brute@test.local' }).expect(200);
		for (let i = 0; i < 5; i++) {
			await request(a)
				.post('/api/auth/verify-otp')
				.set(freshIp())
				.send({ email: 'brute@test.local', otp: '000000', password: 'Password123!' })
				.expect(400);
		}
		const row = await db().token.findFirst({ where: { email: 'brute@test.local' } });
		expect(row?.isRevoked).toBe(true);
	});
});

describe('OAuth over HTTP', () => {
	it('unknown email → find-or-create + tokens; no email → 401; bad token → 401', async () => {
		const a = await api();
		const ok = await request(a).post('/api/auth/google').set(freshIp()).send({ idToken: 'good' }).expect(200);
		expect(ok.body.data.accessToken).toBeDefined();
		expect(await db().user.findUnique({ where: { email: 'g@test.local' } })).not.toBeNull();

		// second login → no duplicate user
		await request(a).post('/api/auth/google').set(freshIp()).send({ idToken: 'good' }).expect(200);
		expect(await db().user.count({ where: { email: 'g@test.local' } })).toBe(1);

		await request(a).post('/api/auth/google').set(freshIp()).send({ idToken: 'noemail' }).expect(401);
		await request(a).post('/api/auth/google').set(freshIp()).send({ idToken: 'junk' }).expect(401);
	});
});
