import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';
import { buildApp } from '../../src/server.js';
import { container } from '../../src/di/container.js';
import { PrismaService } from '../../lib/db.service.js';

let app: Express | null = null;
let ipSeq = 0;

export async function api(): Promise<Express> {
	if (!app) app = await buildApp({ jobs: false });
	return app;
}

export function db() {
	return container.resolve(PrismaService).db;
}

// ponytail: truncate toàn bộ bảng test (trừ migration) — thứ tự không quan trọng nhờ CASCADE.
const TABLES = [
	'"User"', '"Notification"', '"Token"', '"UserImage"', '"Order"', '"OrderPdfJob"',
	'"Transaction"', '"Income"', '"Expense"', '"Cashflow"', '"Book"', '"Cart"',
	'"CartItem"', '"IdempotencyKey"', '"SampleBook"', '"DecorAsset"', '"Supplier"',
	'"PrintOption"', '"SupplierPrintOption"', '"Coupon"', '"FinancePeriod"', '"MaintenanceWindow"',
];

export async function truncate() {
	await db().$executeRawUnsafe(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}

export async function seedUsers() {
	const password = await bcrypt.hash('Password123!', 10);
	const admin = await db().user.create({
		data: { email: 'admin@test.local', password, name: 'Admin', role: 'admin' },
	});
	const user = await db().user.create({
		data: { email: 'user@test.local', password, name: 'User', role: 'user', phone: '0912345678' },
	});
	return { admin, user, password: 'Password123!' };
}

// ponytail: mỗi login 1 IP giả (trust proxy) để khỏi dính authLimiter 10/15p.
export async function loginAs(email: string, password: string) {
	const a = await api();
	ipSeq += 1;
	const res = await request(a)
		.post('/api/auth/login')
		.set('X-Forwarded-For', `10.9.0.${(ipSeq % 200) + 10}`)
		.send({ email, password });
	return res;
}

export function authz(token: string) {
	return { Authorization: `Bearer ${token}` };
}

// ponytail: truncate DB nhưng redis cache còn (ids reset → DTO cũ dính id mới).
// Xả trước mỗi test seed catalog/sample.
export async function flushCache() {
	const { Redis } = await import('ioredis');
	const r = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
		lazyConnect: true,
		maxRetriesPerRequest: 1,
	});
	try {
		await r.flushall();
	} catch {
	} finally {
		r.disconnect();
	}
}

const N = (over = {}) => ({ vi: 'Giấy', en: 'Paper', es: 'Papel', ...over });

// ponytail: seed tối thiểu để checkout chạy (options + book 10 trang + cart đủ option)
export async function seedShop(userId: number) {
	await db().printOption.createMany({
		data: [
			{ type: 'cover', code: 'soft', name: N(), price: 20000 },
			{ type: 'paper', code: 'matt', name: N(), price: 5000 },
			{ type: 'paperSize', code: 'A4', name: N(), width: 210, height: 297 },
		],
	});
	const book = await db().book.create({
		data: {
			userId,
			title: 'B',
			style: 's',
			font: 'f',
			cover: 'soft',
			content: { pages: Array.from({ length: 10 }, (_, i) => ({ index: i })) },
		},
	});
	const cart = await db().cart.create({ data: { userId } });
	await db().cartItem.create({
		data: { cartId: cart.id, bookId: book.id, quantity: 1, cover: 'soft', paper: 'matt', paperSize: 'A4' },
	});
	return { bookId: book.id };
}

export function orderBody(bookId: number) {
	return {
		items: [{ bookId, quantity: 1, cover: 'soft', paper: 'matt', paperSize: 'A4' }],
		name: 'Nguyen Van A',
		phone: '0912345678',
		address: '123 Duong ABC',
		city: 'Ha Noi',
		paymentMethod: 'full-payment',
	};
}
