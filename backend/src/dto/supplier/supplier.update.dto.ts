import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsNumber, 
  IsDateString 
} from "class-validator";

export class UpdateSupplierDTO {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsNumber()
  @IsOptional()
  totalDebt?: number;

  @IsNumber()
  @IsOptional()
  overdueDebt?: number;

  @IsNumber()
  @IsOptional()
  monthDebt?: number;

  @IsDateString()
  @IsOptional()
  lastPaymentDate?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  bankAccountName?: string;

  @IsString()
  @IsOptional()
  status?: string;
}