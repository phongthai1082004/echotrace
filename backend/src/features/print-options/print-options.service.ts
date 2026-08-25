import { injectable, inject } from 'tsyringe';
import { prisma } from '../../../lib/prisma.js';
import { PrintOptionDTO, PrintOptionMapper, ErrorCode } from '@echotrace/shared';
import { AppError } from '../../middleware/app.error.js';
import { OptionCatalogCacheService } from '../../infrastructure/cache/option-catalog.cache.service.js';
import { CreatePrintOptionDTO } from '../../dto/print-option/print-option.create.dto.js';
import { UpdatePrintOptionDTO } from '../../dto/print-option/print-option.update.dto.js';

export abstract class IPrintOptionService {
	abstract list(type?: string, search?: string): Promise<PrintOptionDTO[]>;
	abstract create(dto: CreatePrintOptionDTO): Promise<PrintOptionDTO>;
	abstract update(id: number, dto: UpdatePrintOptionDTO): Promise<PrintOptionDTO>;
	abstract remove(id: number): Promise<void>;
}

@injectable()
export class PrintOptionService extends IPrintOptionService {
	constructor(@inject('IOptionCatalogCacheService') private readonly optionCache: OptionCatalogCacheService) {
		super();
	}

	private async invalidateCache(type: string, code: string) {
		await this.optionCache.invalidateOption(type, code);
	}
	async list(type?: string, search?: string) {
		const rows = await prisma.printOption.findMany({
			where: {
				isDelete: false,
				...(type ? { type } : {}),
				...(search ? { code: { contains: search, mode: 'insensitive' } } : {}),
			},
			orderBy: [{ type: 'asc' }, { code: 'asc' }],
		});
		return PrintOptionMapper.toDTOList(rows);
	}

	async create(dto: CreatePrintOptionDTO) {
		try {
			const row = await prisma.printOption.create({
				data: {
					type: dto.type,
					code: dto.code,
					name: { ...dto.name },
					description: dto.description ? { ...dto.description } : { vi: '', en: '', es: '' },
					width: dto.width ?? null,
					height: dto.height ?? null,
					price: dto.price ?? null,
				},
			});
			await this.invalidateCache(row.type, row.code);
			return PrintOptionMapper.toDTO(row);
		} catch (e: any) {
			if (e?.code === 'P2002') throw new AppError(ErrorCode.PRINT_OPTION_CODE_EXISTS, 409);
			throw e;
		}
	}

	async update(id: number, dto: UpdatePrintOptionDTO) {
		const old = await prisma.printOption.findUnique({ where: { id } });
		if (!old || old.isDelete) throw new AppError(ErrorCode.NOT_FOUND, 404);
		try {
			const row = await prisma.printOption.update({
				where: { id },
				data: {
					...(dto.type !== undefined && { type: dto.type }),
					...(dto.code !== undefined && { code: dto.code }),
					...(dto.name !== undefined && { name: { ...dto.name } }),
					...(dto.description !== undefined && { description: { ...dto.description } }),
					...(dto.width !== undefined && { width: dto.width }),
					...(dto.height !== undefined && { height: dto.height }),
					...(dto.price !== undefined && { price: dto.price }),
				},
			});
			await this.invalidateCache(old.type, old.code);
			await this.invalidateCache(row.type, row.code);
			return PrintOptionMapper.toDTO(row);
		} catch (e: any) {
			if (e?.code === 'P2002') throw new AppError(ErrorCode.PRINT_OPTION_CODE_EXISTS, 409);
			throw e;
		}
	}

	async remove(id: number) {
		const row = await prisma.printOption.findUnique({ where: { id } });
		if (!row || row.isDelete) throw new AppError(ErrorCode.NOT_FOUND, 404);
		await prisma.printOption.update({
			where: { id },
			data: { isDelete: true, deletedAt: new Date() },
		});
		await this.invalidateCache(row.type, row.code);
	}
}