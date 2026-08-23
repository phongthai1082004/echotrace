import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn, IsObject, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export const PRINT_OPTION_TYPES = ['paperSize', 'paper', 'cover'] as const;
export type PrintOptionType = (typeof PRINT_OPTION_TYPES)[number];

export class MultiLangTextDTO {
	@IsString()
	@IsNotEmpty()
	vi!: string;

	@IsString()
	@IsNotEmpty()
	en!: string;

	@IsString()
	@IsNotEmpty()
	es!: string;
}

export class CreatePrintOptionDTO {
	@IsIn(PRINT_OPTION_TYPES, { message: 'Loại option không hợp lệ' })
	type!: PrintOptionType;

	@IsString()
	@IsNotEmpty()
	code!: string;

	@ValidateNested()
	@Type(() => MultiLangTextDTO)
	name!: MultiLangTextDTO;

	@ValidateNested()
	@Type(() => MultiLangTextDTO)
	@IsOptional()
	description?: MultiLangTextDTO;

	@IsInt()
	@Min(1)
	@IsOptional()
	width?: number;

	@IsInt()
	@Min(1)
	@IsOptional()
	height?: number;

	@IsNumber()
	@Min(0)
	@IsOptional()
	price?: number;
}