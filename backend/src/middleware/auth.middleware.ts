import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "./app.error.js";

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new AppError("missing authorization token", 401);

    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string };

    const user = await prisma.user.findUnique({ where: { id: parseInt(payload.userId) }, select: { status: true } });
    if (user?.status === "banned") throw new AppError("Account has been banned", 403);

    req.userId = payload.userId;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError("invalid or expired token", 401));
  }
};
