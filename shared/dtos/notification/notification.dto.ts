import { IsString, IsNotEmpty, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';

// đều 3 thứ tiếng (trống thì lấy tiếng Việt). i18n nằm trong metadata,
// không migration thêm cột.
export class BroadcastNotificationDTO {
	@IsString()
	@IsNotEmpty()
	@MinLength(3)
	@MaxLength(120)
	titleVi!: string;

	@IsString()
	@IsOptional()
	@Matches(/^$|^.{3,120}$/, { message: 'titleEn bỏ trống hoặc từ 3 đến 120 ký tự' })
	titleEn?: string;

	@IsString()
	@IsOptional()
	@Matches(/^$|^.{3,120}$/, { message: 'titleEs bỏ trống hoặc từ 3 đến 120 ký tự' })
	titleEs?: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(2000)
	messageVi!: string;

	@IsString()
	@IsOptional()
	@MaxLength(2000)
	messageEn?: string;

	@IsString()
	@IsOptional()
	@MaxLength(2000)
	messageEs?: string;
}
