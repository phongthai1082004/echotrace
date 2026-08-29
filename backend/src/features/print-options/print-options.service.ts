import { injectable, inject } from 'tsyringe';
import { PrintOptionDTO, PrintOptionMapper, ErrorCode } from '@echotrace/shared';
import { AppError } from '../../middleware/app.error.js';
import { OptionCatalogCacheService } from '../../infrastructure/cache/option-catalog.cache.service.js';
import { CreatePrintOptionDTO } from '@echotrace/shared';
import { UpdatePrintOptionDTO } from '@echotrace/shared';
import { PrintOptionRepository } from './print-options.repository.js';

export interface IPrintOptionService {
	list(type?: string, search?: string): Promise<PrintOptionDTO[]>;
	create(dto: CreatePrintOptionDTO): Promise<PrintOptionDTO>;
	update(id: number, dto: UpdatePrintOptionDTO): Promise<PrintOptionDTO>;
	remove(id: number): Promise<void>;
}

@injectable()
export class PrintOptionService implements IPrintOptionService {
	constructor(
		@inject('IOptionCatalogCacheService') private readonly optionCache: OptionCatalogCacheService,
		@inject('PrintOptionRepository') private readonly printOptionRepo: PrintOptionRepository,
	) {
	}

	private async invalidateCache(type: string, code: string) {
		await this.optionCache.invalidateOption(type, code);
	}
	async list(type?: string, search?: string) {
		const rows = await this.printOptionRepo.listPrintOptions(
			{
				isDelete: false,
				...(type ? { type } : {}),
				...(search ? { code: { contains: search, mode: 'insensitive' } } : {}),
			},
			[{ type: 'asc' as const }, { code: 'asc' as const }],
		);
		return PrintOptionMapper.toDTOList(rows);
	}

	async create(dto: CreatePrintOptionDTO) {
		try {
			const row = await this.printOptionRepo.createPrintOption({
				type: dto.type,
				code: dto.code,
				name: { ...dto.name },
				description: dto.description ? { ...dto.description } : { vi: '', en: '', es: '' },
				width: dto.width ?? null,
				height: dto.height ?? null,
				price: dto.price ?? null,
			});
			await this.invalidateCache(row.type, row.code);
			return PrintOptionMapper.toDTO(row);
		} catch (e: any) {
			if (e?.code === 'P2002') throw new AppError(ErrorCode.PRINT_OPTION_CODE_EXISTS, 409);
			throw e;
		}
	}

	async update(id: number, dto: UpdatePrintOptionDTO) {
		const old = await this.printOptionRepo.findById(id);
		if (!old || old.isDelete) throw new AppError(ErrorCode.NOT_FOUND, 404);
		try {
			const row = await this.printOptionRepo.updatePrintOption(id, {
				...(dto.type !== undefined && { type: dto.type }),
				...(dto.code !== undefined && { code: dto.code }),
				...(dto.name !== undefined && { name: { ...dto.name } }),
				...(dto.description !== undefined && { description: { ...dto.description } }),
				...(dto.width !== undefined && { width: dto.width }),
				...(dto.height !== undefined && { height: dto.height }),
				...(dto.price !== undefined && { price: dto.price }),
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
		const row = await this.printOptionRepo.findById(id);
		if (!row || row.isDelete) throw new AppError(ErrorCode.NOT_FOUND, 404);
		await this.printOptionRepo.softDeletePrintOption(id);
		await this.invalidateCache(row.type, row.code);
	}
}