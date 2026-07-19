import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { AppError } from "../middleware/app.error.js";
import { UserService } from "../services/user.service.js";
import { ApiResponse } from "../middleware/api.response.js";
import { BaseService } from "../utils/base.service.js";
import { prisma } from "../../lib/prisma.js";
import type { UserModel } from "../../generated/prisma/models/User.js";

const userService = new UserService();
const userBase = new BaseService<UserModel>(prisma.user);

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

  async getUserList(req: AuthRequest, res: Response) {
    const { status, customerId, search, order, limit, cursor } = req.query;
    const params = {
      status: status as string | undefined,
      customerId: customerId ? Number(customerId) : undefined,
      search: search as string | undefined,
      order: (order as string) || "desc",
      limit: limit ? Number(limit) : 8,
      cursor: cursor ? Number(cursor) : undefined,
    };
    const options = { searchFields: ["name", "email"], allowedFilterFields: ["status"] };
    const { items, nextCursor } = await userBase.findAll(params, options);
    res.json(ApiResponse.success({ users: items, nextCursor }));
  }
}
