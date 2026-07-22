import { Request, Response, NextFunction } from "express";
import { AppError } from "./app.error.js";
import { ApiResponse } from "./api.response.js";

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let errorCode = "INTERNAL";
  let details: any = null;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.errorCode;
    details = error.details;
  }

  const t = (req as any).i18n?.t;
  const message = t ? t(`errors.${errorCode}`, { defaultValue: errorCode }) : errorCode;

  console.error(`[Error] ${req.method} ${req.url} — ${errorCode} — ${statusCode}`);

  const response = ApiResponse.error(message, statusCode, details);
  return res.status(statusCode).json(response);
};
