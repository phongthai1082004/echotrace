import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min, Max, Matches, MinLength, MaxLength } from 'class-validator';

export class CreateCouponDTO {
	@IsString()
	@IsNotEmpty()
	@MinLength(3)
	@MaxLength(20)
	@Matches(/^[A-Za-z0-9_-]+$/, { message: 'Mã giảm giá chỉ được chứa chữ, số, dấu gạch ngang và gạch dưới' })
	code!: string;

	@IsString()
	@IsOptional()
	scope?: string;

	@IsString()
	@IsNotEmpty()
	discountType!: string;

	@IsNumber()
	@Min(0)
	discountValue!: number;

	@IsNumber()
	@IsOptional()
	@Min(0)
	minOrderAmount?: number;

	@IsNumber()
	@IsOptional()
	@Min(0)
	maxDiscountAmount?: number;

	@IsNumber()
	@IsOptional()
	@Min(0)
	maxUsageCount?: number;

	@IsBoolean()
	@IsOptional()
	isActive?: boolean;

	@IsString()
	@IsOptional()
	expiresAt?: string;
}
