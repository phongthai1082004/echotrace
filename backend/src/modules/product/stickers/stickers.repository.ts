import { injectable, inject } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';

@injectable()
export class DecorAssetRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}

	get client() {
		return this.prismaService.db;
	}

	list(where: Prisma.DecorAssetWhereInput) {
		return this.client.decorAsset.findMany({ where, orderBy: { id: 'desc' } });
	}
	findById(id: number) {
		return this.client.decorAsset.findFirst({ where: { id, isDelete: false } });
	}
	create(data: Prisma.DecorAssetUncheckedCreateInput) {
		return this.client.decorAsset.create({ data });
	}
	remove(id: number) {
		return this.client.decorAsset.deleteMany({ where: { id } });
	}
}
