import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { prisma } from "../../lib/prisma.js";

export class AdminController {
  async updateUserStatus(req: AuthRequest, res: Response) {
    const id = parseInt(String(req.params.id));
    const { status } = req.body;
    if (!status || !["active", "banned"].includes(status)) {
      throw new AppError("status must be 'active' or 'banned'", 400);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError("User not found", 404);

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, status: true },
    });

    res.json(ApiResponse.success(updated));
  }
}
