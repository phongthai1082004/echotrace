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

	// ponytail: raw price/dimension rows used by cart pricing; accepts tx for transactional reads.
	listRaw(tx?: Prisma.TransactionClient) {
		return (tx ?? this.client).printOption.findMany({
			where: { isDelete: false },
			select: { type: true, code: true, price: true, width: true, height: true },
		});
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
