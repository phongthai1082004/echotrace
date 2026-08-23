import { IsString, IsOptional, IsIn, IsInt, IsBoolean, Min } from 'class-validator';

const SAMPLE_BOOK_TYPES = ['TEMPLATE', 'ALBUM'] as const;
const SAMPLE_BOOK_STATUSES = ['draft', 'published', 'archive'] as const;

export class CreateSampleBookDTO {
	@IsString()
	@IsOptional()
	name?: string;

	@IsString()
	@IsOptional()
	description?: string | null;

	@IsIn(SAMPLE_BOOK_TYPES, { message: 'Loại sample book không hợp lệ' })
	@IsOptional()
	type?: (typeof SAMPLE_BOOK_TYPES)[number];

	@IsString()
	@IsOptional()
	category?: string | null;

	@IsInt()
	@Min(0)
	@IsOptional()
	quantity?: number | null;

	@IsString()
	@IsOptional()
	style?: string;

	@IsString()
	@IsOptional()
	font?: string;

	@IsString()
	@IsOptional()
	cover?: string;

	@IsString()
	@IsOptional()
	coverUrl?: string | null;

	@IsInt()
	@Min(0)
	@IsOptional()
	paperHeight?: number | null;

	@IsInt()
	@Min(0)
	@IsOptional()
	paperWidth?: number | null;

	@IsBoolean()
	@IsOptional()
	isActive?: boolean;

	@IsIn(SAMPLE_BOOK_STATUSES, { message: 'Trạng thái sample book không hợp lệ' })
	@IsOptional()
	status?: (typeof SAMPLE_BOOK_STATUSES)[number];

	@IsOptional()
	content?: any;
}

export class UpdateSampleBookDTO {
	@IsString()
	@IsOptional()
	name?: string;

	@IsString()
	@IsOptional()
	description?: string | null;

	@IsIn(SAMPLE_BOOK_TYPES, { message: 'Loại sample book không hợp lệ' })
	@IsOptional()
	type?: (typeof SAMPLE_BOOK_TYPES)[number];

	@IsString()
	@IsOptional()
	category?: string | null;

	@IsInt()
	@Min(0)
	@IsOptional()
	quantity?: number | null;

	@IsIn(SAMPLE_BOOK_STATUSES, { message: 'Trạng thái sample book không hợp lệ' })
	@IsOptional()
	status?: (typeof SAMPLE_BOOK_STATUSES)[number];

	@IsBoolean()
	@IsOptional()
	isActive?: boolean;

	@IsOptional()
	content?: any;
}

export class UpdateSampleBookStatusDTO {
	@IsIn(SAMPLE_BOOK_STATUSES, { message: 'Trạng thái sample book không hợp lệ' })
	status!: (typeof SAMPLE_BOOK_STATUSES)[number];
}