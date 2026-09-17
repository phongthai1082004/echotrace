import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';

// ponytail: seed cho Playwright (DB test disposable) — chạy bằng tsx, không qua jest.
const TABLES = [
	'"User"', '"Notification"', '"Token"', '"UserImage"', '"Order"', '"OrderPdfJob"',
	'"Transaction"', '"Income"', '"Expense"', '"Cashflow"', '"Book"', '"Cart"',
	'"CartItem"', '"IdempotencyKey"', '"SampleBook"', '"DecorAsset"', '"Supplier"',
	'"PrintOption"', '"SupplierPrintOption"', '"Coupon"', '"FinancePeriod"', '"MaintenanceWindow"',
];

await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
// ponytail: maintenance thủ công không qua service — run trước bị hủy giữa chừng có thể kẹt flag ON
await prisma.maintenanceWindow.deleteMany();
const password = await bcrypt.hash('Password123!', 10);
await prisma.user.create({ data: { email: 'admin@test.local', password, name: 'Admin', role: 'admin' } });
const user = await prisma.user.create({ data: { email: 'user@test.local', password, name: 'User', role: 'user', phone: '0912345678' } });
const admin = await prisma.user.findFirstOrThrow({ where: { email: 'admin@test.local' } });

// ponytail: seed tối thiểu cho E2E đọc (explore/my-journals/dispatch/bell)
const sample = await prisma.sampleBook.create({
	data: {
		createdBy: admin.id, name: 'Mau E2E', type: 'TEMPLATE', status: 'published',
		isActive: true, style: 's', font: 'f', cover: 'soft',
	},
});
await prisma.book.create({
	data: { userId: user.id, title: 'Sach E2E', style: 's', font: 'f', content: { pages: [] } },
});
await prisma.order.create({
	data: { userId: user.id, orderCode: 'E2E123', subTotal: 60000, totalAmount: 60000, status: 'pending_payment' },
});
await prisma.notification.create({
	data: {
		userId: user.id, title: 'E2E Chao', message: 'Xin chao E2E', type: 'system',
		channels: ['db', 'push'], scope: 'broadcast', sendBy: 'shop',
		i18n: { title: { vi: 'E2E Chao', en: 'E2E Hello' }, message: { vi: 'Xin chao E2E', en: 'Hello E2E' } },
	},
});
console.log('e2e seed ok');
await prisma.$disconnect();
