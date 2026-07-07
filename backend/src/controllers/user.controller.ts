import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { UserService } from "../services/user.service.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";

const userService = new UserService();

export class UserController {
  async getProfile(req: AuthRequest, res: Response) {
    const result = await userService.getProfile(req.userId!);
    res.json(ApiResponse.success(result));
  }

  async updateProfile(req: AuthRequest, res: Response) {
    const { name, phone, address, city, avatar } = req.body;
    const result = await userService.updateProfile(req.userId!, { name, phone, address, city, avatar });
    res.json(ApiResponse.success(result));
  }

  async getMyBooks(req: AuthRequest, res: Response) {
    const result = await userService.getUserBooks(req.userId!);
    res.json(ApiResponse.success(result));
  }

  async getUsers(req: AuthRequest, res: Response) {
    const result = await userService.getUsers();
    res.json(ApiResponse.success(result));
  }

  async getOtherUserBooks(req: AuthRequest, res: Response) {
    const otherUserId = parseInt(String(req.params.userId));
    if (!otherUserId) throw new AppError("userId param is required", 400);
    const result = await userService.getOtherUserBooks(otherUserId);
    res.json(ApiResponse.success(result));
  }
}
