import { container } from "tsyringe";
import { Router, Request, Response, NextFunction } from "express";
import { UserController } from "../../controllers/user.controller.js";
import { SupplierController } from "../../controllers/supplier.controller.js";
import { authMiddleware, AuthRequest } from "../../middleware/auth.middleware.js";

const router = Router();
const user = container.resolve(UserController);
const supplierCtrl = container.resolve(SupplierController);

const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthRequest, res, next).catch(next);

router.use(authMiddleware);

router.get("/profile", asyncHandler((req, res) => user.getProfile(req, res)));
router.put("/profile", asyncHandler((req, res) => user.updateProfile(req, res)));
router.put("/change-password", asyncHandler((req, res) => user.changePassword(req, res)));
router.get("/suppliers/availability", asyncHandler((req, res) => supplierCtrl.getAvailableSuppliers(req, res)));
router.get("/suppliers/options", asyncHandler((req, res) => supplierCtrl.getAggregatedOptions(req, res)));
router.get("/suppliers/price-options", asyncHandler((req, res) => supplierCtrl.getPriceOptions(req, res)));

export default router;
