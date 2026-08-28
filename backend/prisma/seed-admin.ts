import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';

async function main() {
	const userCount = await prisma.user.count();
	const supplierCount = await prisma.supplier.count();

	if (userCount === 0) {
		const adminPassword = process.env.SEED_ADMIN_PASSWORD || randomBytes(12).toString('hex');
		const adminHash = await bcrypt.hash(adminPassword, 10);
		const userHash = await bcrypt.hash('user123', 10);
		console.log(`Seeded admin password: ${adminPassword}`);

		await prisma.user.createMany({
			data: [
				{ email: 'admin@cabinetmemoir.app', password: adminHash, name: 'Admin One', role: 'admin', isDelete: false },
				{ email: 'admin2@cabinetmemoir.app', password: adminHash, name: 'Admin Two', role: 'admin', isDelete: false },
				{
					email: 'minh@example.com',
					password: userHash,
					name: 'Nguyễn Văn Minh',
					phone: '0912345678',
					address: '12 Lê Duẩn',
					city: 'Hà Nội',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'thao@example.com',
					password: userHash,
					name: 'Trần Thị Thảo',
					phone: '0934567890',
					address: '45 Nguyễn Huệ',
					city: 'TP. Hồ Chí Minh',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'hung@example.com',
					password: userHash,
					name: 'Lê Văn Hùng',
					phone: '0978123456',
					address: '78 Bạch Đằng',
					city: 'Đà Nẵng',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'lan@example.com',
					password: userHash,
					name: 'Phạm Thị Lan',
					phone: '0900111222',
					address: '23 Trần Phú',
					city: 'Hải Phòng',
					role: 'user',
					isDelete: true,
				},
				{
					email: 'tuan@example.com',
					password: userHash,
					name: 'Hoàng Văn Tuấn',
					phone: '0966333444',
					address: '56 Kim Mã',
					city: 'Hà Nội',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'mai@example.com',
					password: userHash,
					name: 'Đỗ Thị Mai',
					phone: '0988777666',
					address: '89 Lạc Long Quân',
					city: 'Cần Thơ',
					role: 'user',
					isDelete: true,
				},
				{
					email: 'son@example.com',
					password: userHash,
					name: 'Bùi Văn Sơn',
					phone: '0911222333',
					address: '34 Xô Viết Nghệ Tĩnh',
					city: 'Đà Nẵng',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'anh@example.com',
					password: userHash,
					name: 'Vũ Thị Anh',
					phone: '0977444555',
					address: '67 Hoàng Văn Thụ',
					city: 'TP. Hồ Chí Minh',
					role: 'user',
					isDelete: false,
				},

				{
					email: 'dung@example.com',
					password: userHash,
					name: 'Phan Tiến Dũng',
					phone: '0903123890',
					address: '102 Nguyễn Trãi',
					city: 'Thanh Hóa',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'phuong@example.com',
					password: userHash,
					name: 'Ngô Bích Phương',
					phone: '0945888999',
					address: '15 Lê Lợi',
					city: 'Huế',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'khoa@example.com',
					password: userHash,
					name: 'Đặng Đăng Khoa',
					phone: '0938777111',
					address: '88 Điện Biên Phủ',
					city: 'Bình Dương',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'trinh@example.com',
					password: userHash,
					name: 'Nguyễn Phương Trinh',
					phone: '0918999222',
					address: '245 Võ Văn Kiệt',
					city: 'TP. Hồ Chí Minh',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'long@example.com',
					password: userHash,
					name: 'Trịnh Quốc Long',
					phone: '0972333888',
					address: '18 Hoàng Diệu',
					city: 'Nha Trang',
					role: 'user',
					isDelete: true,
				},
				{
					email: 'ha@example.com',
					password: userHash,
					name: 'Dương Thu Hà',
					phone: '0905444111',
					address: '91 Cầu Giấy',
					city: 'Hà Nội',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'khanh@example.com',
					password: userHash,
					name: 'Vũ Gia Khánh',
					phone: '0968111999',
					address: '52 Trần Hưng Đạo',
					city: 'Quảng Ninh',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'nhien@example.com',
					password: userHash,
					name: 'Lê An Nhiên',
					phone: '0933222888',
					address: '73 Nguyễn Văn Linh',
					city: 'Đà Nẵng',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'quan@example.com',
					password: userHash,
					name: 'Lương Minh Quân',
					phone: '0981555666',
					address: '119 Lý Thường Kiệt',
					city: 'Vũng Tàu',
					role: 'user',
					isDelete: false,
				},
				{
					email: 'quang.admin@cabinetmemoir.app',
					password: adminHash,
					name: 'Trần Minh Quang',
					phone: '0909000999',
					address: '88 Phạm Văn Đồng',
					city: 'Hà Nội',
					role: 'admin',
					isDelete: false,
				},
			],
		});
		console.log(`Seeded ${await prisma.user.count()} users.`);
	} else {
		console.log(`Users table has ${userCount} records — skipping.`);
	}

	if (supplierCount === 0) {
		await prisma.supplier.createMany({
			data: [
				{
					name: 'Nhà Máy Giấy & In Bình Dương',
					contact: 'Lê Văn Bình',
					email: 'binh@giayin.vn',
					isDelete: false,
					totalDebt: 15000000,
					monthDebt: 5000000,
				},
				{
					name: 'Xưởng Đóng Sách Thủ Công Hà Nội',
					contact: 'Phạm Hoàng',
					email: 'hoang@sach.vn',
					isDelete: false,
					totalDebt: 42000000,
					monthDebt: 8000000,
				},
			],
		});
		console.log(`Seeded ${await prisma.supplier.count()} suppliers.`);
	} else {
		console.log(`Suppliers table has ${supplierCount} records — skipping.`);
	}

	// Options giờ là danh mục GLOBAL (PrintOption) + link per-supplier (SupplierPrintOption).
	type Opt = { code: string; name: { vi: string; en: string; es: string }; width?: number; height?: number; price?: number };
	const kitsBySupplier: { type: string; options: Opt[] }[][] = [
		[
			{
				type: 'paperSize',
				options: [
					{ code: '15x15', name: { vi: '15×15 cm', en: '15×15 cm', es: '15×15 cm' }, width: 150, height: 150 },
					{ code: '20x20', name: { vi: '20×20 cm', en: '20×20 cm', es: '20×20 cm' }, width: 200, height: 200 },
					{ code: 'A4', name: { vi: 'A4 (21×29.7 cm)', en: 'A4 (21×29.7 cm)', es: 'A4 (21×29.7 cm)' }, width: 210, height: 297 },
				],
			},
			{
				type: 'paper',
				options: [
					{ code: 'offset100', name: { vi: 'Giấy offset 100gsm', en: 'Offset 100gsm', es: 'Papel offset 100gsm' }, price: 2500 },
					{ code: 'matte230', name: { vi: 'Matte 230gsm', en: 'Matte 230gsm', es: 'Mate 230gsm' }, price: 5000 },
				],
			},
			{
				type: 'cover',
				options: [
					{ code: 'softcover', name: { vi: 'Bìa mềm', en: 'Softcover', es: 'Tapa blanda' }, price: 10000 },
					{ code: 'saddleStitch', name: { vi: 'Ghim lò xo', en: 'Saddle stitch', es: 'Grapado' }, price: 8000 },
				],
			},
		],
		// Supplier 2 — Công ty In ấn Việt Đức: phân khúc cao cấp (tái dùng option đã có).
		[
			{
				type: 'paperSize',
				options: [
					{ code: '30x30', name: { vi: '30×30 cm', en: '30×30 cm', es: '30×30 cm' }, width: 300, height: 300 },
					{ code: 'A4', name: { vi: 'A4 (21×29.7 cm)', en: 'A4 (21×29.7 cm)', es: 'A4 (21×29.7 cm)' }, width: 210, height: 297 },
					{ code: 'A5', name: { vi: 'A5 (14.8×21 cm)', en: 'A5 (14.8×21 cm)', es: 'A5 (14.8×21 cm)' }, width: 148, height: 210 },
				],
			},
			{
				type: 'paper',
				options: [
					{ code: 'couche200', name: { vi: 'Couche bóng 200gsm', en: 'Gloss couche 200gsm', es: 'Couche brillante 200gsm' }, price: 4000 },
					{ code: 'lustre250', name: { vi: 'Lustre 250gsm', en: 'Lustre 250gsm', es: 'Satinado 250gsm' }, price: 6500 },
					{ code: 'cotton300', name: { vi: 'Giấy cotton 300gsm', en: 'Cotton 300gsm', es: 'Algodón 300gsm' }, price: 12000 },
				],
			},
			{
				type: 'cover',
				options: [
					{ code: 'hardcover', name: { vi: 'Bìa cứng', en: 'Hardcover', es: 'Tapa dura' }, price: 25000 },
					{ code: 'leather', name: { vi: 'Bìa da PU', en: 'PU leather', es: 'Cuero PU' }, price: 40000 },
				],
			},
		],
	];

	const firstTwo = await prisma.supplier.findMany({
		where: { isDelete: false },
		orderBy: { id: 'asc' },
		take: 2,
		select: { id: true, name: true },
	});

	for (const [i, supplier] of firstTwo.entries()) {
		const kits = kitsBySupplier[i] ?? [];
		for (const kit of kits) {
			for (const opt of kit.options) {
				const data = {
					name: opt.name,
					description: { vi: '', en: '', es: '' },
					width: opt.width ?? null,
					height: opt.height ?? null,
					price: opt.price ?? null,
				};
				const po = await prisma.printOption.upsert({
					where: { type_code: { type: kit.type, code: opt.code } },
					update: data,
					create: { type: kit.type, code: opt.code, ...data },
				});
				await prisma.supplierPrintOption.upsert({
					where: { supplierId_printOptionId: { supplierId: supplier.id, printOptionId: po.id } },
					update: { isDelete: false, deletedAt: null },
					create: { supplierId: supplier.id, printOptionId: po.id },
				});
			}
		}
		console.log(`Seeded options for supplier #${supplier.id} (${supplier.name}).`);
	}

	const keepCodes = (i: number, type: string) =>
		new Set((kitsBySupplier[i] ?? []).find((k) => k.type === type)?.options.map((o) => o.code) ?? []);
	const allTypes = ['paperSize', 'paper', 'cover'] as const;
	for (const [i, supplier] of firstTwo.entries()) {
		for (const type of allTypes) {
			const keep = [...keepCodes(i, type)];
			const poRows = await prisma.printOption.findMany({ where: { type, isDelete: false } });
			const staleIds = poRows.filter((p) => !keep.includes(p.code)).map((p) => p.id);
			if (staleIds.length) {
				await prisma.supplierPrintOption.updateMany({
					where: { supplierId: supplier.id, printOptionId: { in: staleIds }, isDelete: false },
					data: { isDelete: true, deletedAt: new Date() },
				});
			}
		}
	}
	console.log('Seed complete.');
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
