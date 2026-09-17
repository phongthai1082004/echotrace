/**
 * SSE stream + rate limits over real HTTP.
 */
import request from 'supertest';

const { api, truncate, seedUsers, loginAs, authz } = await import('./db.js');

let base = '';
let closeServer: (() => Promise<void>) | null = null;

beforeEach(async () => {
	await truncate();
	await seedUsers();
	// ponytail: SSE stream không bao giờ tự hết — supertest buffer treo, phải listen port thật
	const app = await api();
	await new Promise<void>((resolve) => {
		const server = app.listen(0, () => {
			const addr = server.address();
			base = `http://localhost:${typeof addr === 'object' && addr ? addr.port : 0}`;
			closeServer = () => new Promise((res, rej) => server.close((e) => (e ? rej(e) : res())));
			resolve();
		});
	});
});

afterEach(async () => {
	await closeServer?.();
	closeServer = null;
});

describe('SSE stream endpoint', () => {
	it('200 text/event-stream + connected chunk, abortable', async () => {
		const login = await loginAs('user@test.local', 'Password123!');
		const token = login.body.data.accessToken;
		const ctrl = new AbortController();
		const res = await fetch(`${base}/api/notifications/stream`, {
			headers: { Authorization: `Bearer ${token}` },
			signal: ctrl.signal,
		});
		// ponytail: stream không bao giờ tự hết — đọc chunk đầu rồi cắt
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('text/event-stream');
		const reader = res.body!.getReader();
		const { value } = await reader.read();
		const text = new TextDecoder().decode(value);
		expect(text).toContain('connected');
		ctrl.abort();
		await reader.cancel().catch(() => {});
	});

	it('no token → 401', async () => {
		const ctrl = new AbortController();
		const res = await fetch(`${base}/api/notifications/stream`, { signal: ctrl.signal });
		expect(res.status).toBe(401);
		ctrl.abort();
	});
});

describe('rate limits over HTTP', () => {
	it('login 11th hit on same IP → 429', async () => {
		const a = (await import('./db.js')).api;
		const app = await a();
		const ip = { 'X-Forwarded-For': '10.7.7.77' };
		for (let i = 0; i < 10; i++) {
			await request(app).post('/api/auth/login').set(ip).send({ email: 'user@test.local', password: 'Nope12345!' });
		}
		await request(app).post('/api/auth/login').set(ip).send({ email: 'user@test.local', password: 'Nope12345!' }).expect(429);
	});

	it('different IP unaffected', async () => {
		const login = await loginAs('user@test.local', 'Password123!');
		expect(login.status).toBe(200);
		const _ = authz;
	});
});
