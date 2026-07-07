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
    let message = "Internal Error!";
    let details = error.message;

    if (error instanceof AppError) {
        statusCode = error.statusCode
        message = error.message,
        details = "Requirement Error!"
    }

  console.error(`[Error] ${req.method} ${req.url} - Status: ${statusCode} - Message: ${error.message}`);

  const response = ApiResponse.error(message, statusCode, details);
  return res.status(statusCode).json(response);
}
