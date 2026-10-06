import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import type {IProfileService} from './profile.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';
import { AppError } from '../../../shared/middleware/app.error.js';
import { ErrorCode, UpdateProfileDTO } from '@echotrace/shared';
import { asString } from '../../../shared/middleware/parse-params.js';

@injectable()
export class ProfileController {
	constructor(@inject('IProfileService') private readonly profileService: IProfileService) {}

	getProfile = async (req: AuthRequest, res: Response) => {
		const result = await this.profileService.getProfile(req.userId!);
		res.json(ApiResponse.success(result));
	};

	updateProfile = async (req: AuthRequest, res: Response) => {
		const { name, phone, address, city } = req.body ?? {};
		const result = await this.profileService.updateProfile(req.userId!, {
			name: asString(name, 100),
			phone: asString(phone, 20),
			address: asString(address, 500),
			city: asString(city, 100),
		} as UpdateProfileDTO);
		res.json(ApiResponse.success(result));
	};

	changePassword = async (req: AuthRequest, res: Response) => {
		const { currentPassword, newPassword } = req.body ?? {};
		if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
			throw new AppError(ErrorCode.VALIDATION_FAILED, 400, { newPassword: ['min 8, max 128 chars'] });
		}
		const result = await this.profileService.changePassword(req.userId!, {
			currentPassword: typeof currentPassword === 'string' ? currentPassword : undefined,
			newPassword,
		});
		res.json(ApiResponse.success(result));
	};

	stampAttribution = async (req: AuthRequest, res: Response) => {
		const { source, medium, campaign } = req.body ?? {};
		const result = await this.profileService.stampAttribution(req.userId!, {
			source: asString(source, 100),
			medium: asString(medium, 100),
			campaign: asString(campaign, 100),
		});
		res.json(ApiResponse.success(result));
	};
}
