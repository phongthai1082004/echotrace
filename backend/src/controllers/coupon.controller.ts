import { injectable, inject } from "tsyringe";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { ErrorCode } from "@echotrace/shared";
import { ICouponService } from "../services/coupon.service.js";

@injectable()
export class CouponController {
  constructor(@inject("ICouponService") private readonly service: ICouponService) {}

  list = async (req: AuthRequest, res: Response) => {
    const coupons = await this.service.list();
    res.json(ApiResponse.success(coupons));
  };

  create = async (req: AuthRequest, res: Response) => {
    const { code, scope, discountType, discountValue, minOrderAmount, maxDiscountAmount, maxUsageCount, isActive, expiresAt } = req.body;
    const coupon = await this.service.create({ code, scope, discountType, discountValue, minOrderAmount, maxDiscountAmount, maxUsageCount, isActive, expiresAt });
    res.status(201).json(ApiResponse.success(coupon));
  };

  remove = async (req: AuthRequest, res: Response) => {
    const id = parseInt(String(req.params.id));
    await this.service.remove(id);
    res.json(ApiResponse.message("Coupon deleted"));
  };
}
