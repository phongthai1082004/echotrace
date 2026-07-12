import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { prisma } from "../../lib/prisma.js";

export class AdminController {
  async listUsers(req: AuthRequest, res: Response) {
    const { search, role, page: pageStr, limit: limitStr } = req.query as any;
    const page = Math.max(1, parseInt(pageStr) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          role: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json(ApiResponse.success({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status || "active",
        role: u.role,
        orders: u._count.orders,
        joinedAt: u.createdAt,
      })),
      total,
      page,
      limit,
    }));
  }

  async updateUserStatus(req: AuthRequest, res: Response) {
    const id = parseInt(req.params.id);
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
