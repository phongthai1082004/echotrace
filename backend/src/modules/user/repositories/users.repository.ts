import { injectable, inject } from 'tsyringe';
import { PrismaService } from '../../../../lib/db.service.js';
import { Prisma } from '../../../../generated/prisma/client.js';

// Service chỉ biết UserRepository; không có $transaction ở feature này nên không cần tx?.
@injectable()
export class UserRepository {
	constructor(@inject('PrismaService') private prismaService: PrismaService) {}

	get client() {
		return this.prismaService.db;
	}

	findById(id: number, extraWhere: Record<string, any> = {}) {
		return this.client.user.findFirst({ where: Object.assign({ id, isDelete: false }, extraWhere) });
	}
	updateById(id: number, data: Record<string, unknown>, extraWhere: Record<string, any> = {}) {
		const where = Object.assign({ id, isDelete: false }, extraWhere);
		return this.client.user.updateMany({ where, data: data as Prisma.UserUpdateManyMutationInput });
	}
	findByIdFull(id: number) {
		return this.client.user.findUnique({
			where: { id },
			select: {
				id: true,
				email: true,
				name: true,
				avatar: true,
				phone: true,
				address: true,
				city: true,
				role: true,
				isDelete: true,
				password: true,
			},
		});
	}
	findByPhone(phone: string) {
		return this.client.user.findFirst({ where: { phone } });
	}
	updateUser(id: number, data: Record<string, unknown>) {
		return this.client.user.update({ where: { id }, data: data as Prisma.UserUpdateInput });
	}
	findByIdForPassword(id: number) {
		return this.client.user.findUnique({ where: { id } });
	}
	findRoleById(id: number) {
		return this.client.user.findUnique({ where: { id }, select: { id: true, role: true } });
	}
}
