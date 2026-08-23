import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min, Matches, MinLength, MaxLength, IsIn } from 'class-validator';

export class CreateCouponDTO {
	@IsString()
	@IsNotEmpty()
	@MinLength(3)
	@MaxLength(20)
	@Matches(/^[A-Za-z0-9_-]+$/, { message: 'Mã giảm giá chỉ được chứa chữ, số, dấu gạch ngang và gạch dưới' })
	code!: string;

	@IsIn(['percentage', 'fixed'], { message: 'discountType phải là percentage hoặc fixed' })
	discountType!: string;

	@IsNumber()
	@Min(0)
	discountValue!: number;

	@IsNumber()
	@IsOptional()
	@Min(0)
	minOrderAmount?: number;

	@IsString()
	@IsOptional()
	@Matches(/^(VALUE|QUANTITY|value|quantity)$/, { message: 'minOrderType phải là VALUE hoặc QUANTITY' })
	minOrderType?: string;

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
