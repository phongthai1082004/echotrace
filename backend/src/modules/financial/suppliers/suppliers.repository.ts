import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';

@injectable()
export class SupplierRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}

	get client() {
		return this.prismaService.db;
	}

	findSupplierById(id: number) {
		return this.client.supplier.findFirst({ where: { id } });
	}

	createSupplier(data: Prisma.SupplierUncheckedCreateInput) {
		return this.client.supplier.create({ data });
	}

	updateSupplier(id: number, data: Record<string, unknown>) {
		return this.client.supplier.updateMany({ where: { id }, data: data as Prisma.SupplierUpdateManyMutationInput });
	}

	deleteSupplier(id: number) {
		return this.client.supplier.updateMany({
			where: { id, isDelete: false },
			data: { isDelete: true, deletedAt: new Date() },
		});
	}

	listSupplierPrintOptions(ids: number[]) {
		return this.client.supplierPrintOption.findMany({
			where: { supplierId: { in: ids }, isDelete: false },
			orderBy: { id: 'desc' },
			take: 10000,
			select: { supplierId: true, printOptionId: true },
		});
	}

	listPrintOptionsByIds(ids: number[]) {
		return this.client.printOption.findMany({
			where: { id: { in: ids } },
			select: { id: true, type: true, code: true, name: true, description: true, width: true, height: true, price: true },
		});
	}

	listActivePrintOptions() {
		return this.client.printOption.findMany({ where: { isDelete: false }, orderBy: { type: 'asc' } });
	}

	listPrintOptionsByType(type: string) {
		return this.client.printOption.findMany({ where: { type, isDelete: false }, orderBy: { updatedAt: 'desc' } });
	}

	findPrintOptionByTypeCode(type: string, code: string) {
		return this.client.printOption.findFirst({ where: { type, code, isDelete: false } });
	}
}
