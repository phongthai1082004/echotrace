import { IsString, IsOptional, IsNumber, IsIn, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PRINT_OPTION_TYPES, PrintOptionType, MultiLangTextDTO } from './print-option.create.dto.js';

export class UpdatePrintOptionDTO {
	@IsIn(PRINT_OPTION_TYPES, { message: 'Loại option không hợp lệ' })
	@IsOptional()
	type?: PrintOptionType;

	@IsString()
	@IsOptional()
	code?: string;

	@ValidateNested()
	@Type(() => MultiLangTextDTO)
	@IsOptional()
	name?: MultiLangTextDTO;

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
