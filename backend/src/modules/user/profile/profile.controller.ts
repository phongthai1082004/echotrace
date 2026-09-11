import { injectable, inject } from 'tsyringe';
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { IProfileService } from './profile.service.js';
import { ApiResponse } from '../../../shared/middleware/api.response.js';

@injectable()
export class ProfileController {
	constructor(@inject('IProfileService') private readonly profileService: IProfileService) {}

	getProfile = async (req: AuthRequest, res: Response) => {
		const result = await this.profileService.getProfile(req.userId!);
		res.json(ApiResponse.success(result));
	};

	updateProfile = async (req: AuthRequest, res: Response) => {
		const { name, phone, address, city } = req.body;
		const result = await this.profileService.updateProfile(req.userId!, { name, phone, address, city });
		res.json(ApiResponse.success(result));
	};

	changePassword = async (req: AuthRequest, res: Response) => {
		const result = await this.profileService.changePassword(req.userId!, req.body);
		res.json(ApiResponse.success(result));
	};
}
