import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { BaseService } from "../utils/base.service.js";
import { prisma } from "../../lib/prisma.js";
import type { UserModel } from "../../generated/prisma/models/User.js";

const userBase = new BaseService<UserModel>(prisma.user);

export class AdminController {
  async updateUserStatus(req: AuthRequest, res: Response) {
    const id = parseInt(String(req.params.id));
    const { status } = req.body;
    if (!status || !["active", "banned"].includes(status)) {
      throw new AppError("status must be 'active' or 'banned'", 400);
    }
    await userBase.update(id, { status });
    const updated = await userBase.findById(id);
    res.json(ApiResponse.success({
      id: updated.id, name: updated.name, email: updated.email, status: updated.status,
    }));
  }
}
