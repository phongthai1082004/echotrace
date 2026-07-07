import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./app.error.js";

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new AppError("missing authorization token", 401);

    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError("invalid or expired token", 401));
  }
};
