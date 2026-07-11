import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { AppError } from "../middleware/app.error.js";
import { UserService } from "../services/user.service.js";
import { ApiResponse } from "../middleware/api.response.js";

const userService = new UserService();

export class UserController {
  async getProfile(req: AuthRequest, res: Response) {
    const result = await userService.getProfile(req.userId!);
    res.json(ApiResponse.success(result));
  }

  async updateProfile(req: AuthRequest, res: Response) {
    const { name, phone, address, city } = req.body;
    const result = await userService.updateProfile(req.userId!, { name, phone, address, city });
    res.json(ApiResponse.success(result));
  }

  async changePassword(req: AuthRequest, res: Response) {
    const result = await userService.changePassword(req.userId!, req.body);
    res.json(ApiResponse.success(result));
  }

  async saveAvatarUrl(req: AuthRequest, res: Response) {
    const { url } = req.body;
    if (!url) throw new AppError("No URL provided", 400);

    const updated = await userService.saveAvatarUrl(req.userId!, url);
    res.json(ApiResponse.success(updated));
  }
}
