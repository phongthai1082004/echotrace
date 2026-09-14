import { IsString, IsOptional, IsInt, IsArray, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnItemDTO {
	@IsInt()
	index!: number;

	@IsInt()
	@Min(1)
	quantity!: number;

	@IsString()
	@IsOptional()
	defect?: string;
}

export class RequestReturnDTO {
	@IsString()
	@IsOptional()
	reason?: string;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ReturnItemDTO)
	@IsOptional()
	items?: ReturnItemDTO[];
}
