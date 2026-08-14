import { injectable, inject } from "tsyringe";
import { Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { ErrorCode } from "@echotrace/shared";
import { IUserService } from "../services/user.service.js";

@injectable()
export class AdminController {
  constructor(
    @inject("IUserService") private readonly userService: IUserService,
  ) {}

  updateUserStatus = async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id));
    const { status } = req.body;
    if (!status || !["active", "banned"].includes(status)) {
      throw new AppError(ErrorCode.ADMIN_INVALID_STATUS, 400);
    }
    const banned = status === "banned";
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new AppError(ErrorCode.NOT_FOUND, 404);
    if (target.role === "admin") {
      throw new AppError(ErrorCode.ADMIN_CANNOT_BAN_ADMIN, 403);
    }
    const updated = await prisma.user.update({
      where: { id },
      data: { isDelete: banned, deletedAt: banned ? new Date() : null },
    });
    res.json(ApiResponse.success({
      id: updated.id, name: updated.name, email: updated.email, banned: updated.isDelete,
    }));
  };
}
