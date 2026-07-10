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
}
