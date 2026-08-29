import { IsString, IsNotEmpty, IsEmail, IsOptional, Matches, IsArray, IsInt } from 'class-validator';

export class CreateSupplierDTO {
	@IsString()
	@IsNotEmpty()
	@Matches(/^[^\d]+$/, { message: 'Tên nhà cung cấp không được chứa số' })
	name!: string;

	@IsString()
	@IsNotEmpty()
	@Matches(/^\d{10,11}$/, { message: 'Số điện thoại không hợp lệ (phải 10-11 chữ số)' })
	contact!: string;

	@IsString()
	@IsEmail()
	email!: string;

	@IsString()
	@IsOptional()
	@Matches(/^[^\d]*$/, { message: 'Tên ngân hàng không được chứa số' })
	bankName?: string;

	@IsString()
	@IsOptional()
	@Matches(/^\d*$/, { message: 'Số tài khoản chỉ được chứa số' })
	bankAccountNumber?: string;

	@IsString()
	@IsOptional()
	@Matches(/^[^\d]*$/, { message: 'Tên chủ tài khoản không được chứa số' })
	bankAccountName?: string;

	@IsString()
	@IsOptional()
	bankBin?: string;

	@IsString()
	@IsOptional()
	taxCode?: string;

	@IsString()
	@IsOptional()
	address?: string;

	@IsString()
	@IsOptional()
	contactPerson?: string;

	@IsArray()
	@IsInt({ each: true })
	@IsOptional()
	optionIds?: number[];
}
