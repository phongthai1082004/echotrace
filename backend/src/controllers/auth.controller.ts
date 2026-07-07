import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";

const authService = new AuthService();

export class AuthController {
  async googleLogin(req: Request, res: Response) {
    const { idToken } = req.body;
    if (!idToken) throw new AppError("idToken is required", 400);

    const result = await authService.loginWithGoogle(idToken);
    res.json(ApiResponse.success(result));
  }

  async register(req: Request, res: Response) {
    const { username, password } = req.body;
    if (!username || !password) throw new AppError("username and password are required", 400);
    if (!/^[a-z0-9._]{3,30}$/.test(username) || /^[._]|[._]$/.test(username) || /[._]{2,}/.test(username))
      throw new AppError("username must be 3–30 characters, lowercase, no special chars", 400);

    const result = await authService.register(username, password);
    res.status(201).json(ApiResponse.success(result));
  }

  async login(req: Request, res: Response) {
    const { username, password } = req.body;
    if (!username || !password) throw new AppError("username and password are required", 400);

    const result = await authService.login(username, password);
    res.json(ApiResponse.success(result));
  }

  async logout(req: Request, res: Response) {
    const { userId } = req.body;
    if (!userId) throw new AppError("userId is required", 400);

    await authService.logout(userId);
    res.json(ApiResponse.message("logged out"));
  }
}
