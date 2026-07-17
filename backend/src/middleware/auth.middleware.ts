import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "./app.error.js";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new AppError("missing authorization token", 401);

    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: parseInt(payload.userId) },
      select: { status: true, role: true },
    });
    if (!user || user.status === "banned") throw new AppError("Account has been banned", 403);

    req.userId = payload.userId;
    req.userRole = user?.role;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError("invalid or expired token", 401));
  }
};

export const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  await authMiddleware(req, res, () => {
    if (req.userRole !== "admin") return next(new AppError("Admin access required", 403));
    next();
  });
};
