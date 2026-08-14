import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsNumber, 
  IsDateString,
  IsArray,
  Matches,
} from "class-validator";
import { SupplierOption } from "@echotrace/shared";

export class UpdateSupplierDTO {
  @IsString()
  @IsOptional()
  @Matches(/^[^\d]*$/, { message: "Tên nhà cung cấp không được chứa số" })
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{10,11}$/, { message: "Số điện thoại không hợp lệ (phải 10-11 chữ số)" })
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
  @Matches(/^[^\d]*$/, { message: "Tên ngân hàng không được chứa số" })
  bankName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d*$/, { message: "Số tài khoản chỉ được chứa số" })
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[^\d]*$/, { message: "Tên chủ tài khoản không được chứa số" })
  bankAccountName?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @IsOptional()
  paperSizeOptions?: SupplierOption[];

  @IsArray()
  @IsOptional()
  paperOptions?: SupplierOption[];

  @IsArray()
  @IsOptional()
  coverOptions?: SupplierOption[];
}