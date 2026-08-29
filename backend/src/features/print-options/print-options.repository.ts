import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../../lib/db.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

// ponytail: repository layer — tách toàn bộ truy cập Prisma của feature print-options ra khỏi service.
@injectable()
export class PrintOptionRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}

	get client() {
		return this.prismaService.db;
	}

	listPrintOptions(where: Prisma.PrintOptionWhereInput, orderBy: Prisma.PrintOptionOrderByWithRelationInput | Prisma.PrintOptionOrderByWithRelationInput[]) {
		return this.client.printOption.findMany({ where, orderBy });
	}

	createPrintOption(data: Prisma.PrintOptionUncheckedCreateInput) {
		return this.client.printOption.create({ data });
	}

	findById(id: number) {
		return this.client.printOption.findUnique({ where: { id } });
	}

	updatePrintOption(id: number, data: Record<string, unknown>) {
		return this.client.printOption.update({ where: { id }, data: data as Prisma.PrintOptionUpdateInput });
	}

	softDeletePrintOption(id: number) {
		return this.client.printOption.update({ where: { id }, data: { isDelete: true, deletedAt: new Date() } });
	}
}
