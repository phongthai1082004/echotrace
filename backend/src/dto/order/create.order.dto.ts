import { 
  IsString, 
  IsOptional, 
  IsInt, 
  IsPositive,
} from 'class-validator';

export class CreateOrderDto {

  @IsInt()
  @IsPositive()
  userId!: number;

  @IsString()
  @IsOptional()
  paymentType?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  couponId?: number;
}