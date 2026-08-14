import { injectable, inject } from "tsyringe";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { IUserService } from "../services/user.service.js";
import { ApiResponse } from "../middleware/api.response.js";

@injectable()
export class UserController {
  constructor(
    @inject("IUserService") private readonly userService: IUserService,
  ) {}

  getProfile = async (req: AuthRequest, res: Response) => {
    const result = await this.userService.getProfile(req.userId!);
    res.json(ApiResponse.success(result));
  };

  updateProfile = async (req: AuthRequest, res: Response) => {
    const { name, phone, address, city } = req.body;
    const result = await this.userService.updateProfile(req.userId!, { name, phone, address, city });
    res.json(ApiResponse.success(result));
  };

  changePassword = async (req: AuthRequest, res: Response) => {
    const result = await this.userService.changePassword(req.userId!, req.body);
    res.json(ApiResponse.success(result));
  };

  getUserList = async (req: AuthRequest, res: Response) => {
    const { status, customerId, search, order, limit, cursor } = req.query;
    const extraWhere: any = {};
    if (status === "banned") extraWhere.isDelete = true;
    else if (status === "active") extraWhere.isDelete = false;
    else extraWhere.isDelete = undefined;
    const params = {
      customerId: customerId ? Number(customerId) : undefined,
      search: search as string | undefined,
      order: (order as string) || "desc",
      limit: limit ? Number(limit) : 1000,
      cursor: cursor ? Number(cursor) : undefined,
    };
    const options = { searchFields: ["name", "email"], allowedFilterFields: [] };
    const { items, nextCursor } = await this.userService.findAll(params, options, extraWhere);
    res.json(ApiResponse.success({ users: items, nextCursor }));
  };
}
