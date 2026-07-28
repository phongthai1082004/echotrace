import { injectable, inject } from "tsyringe";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { ErrorCode } from "../errors/error-codes.js";
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
    const target = await this.userService.findById(id);
    if (target.role === "admin") {
      throw new AppError(ErrorCode.ADMIN_CANNOT_BAN_ADMIN, 403);
    }
    await this.userService.update(id, { status });
    const updated = await this.userService.findById(id);
    res.json(ApiResponse.success({
      id: updated.id, name: updated.name, email: updated.email, status: updated.status,
    }));
  };
}
