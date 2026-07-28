import { container } from "tsyringe";
import { Router, Request, Response, NextFunction } from "express";
import { AdminController } from "../../controllers/admin.controller.js";
import { StickerController } from "../../controllers/sticker.controller.js";
import { SupplierController } from "../../controllers/supplier.controller.js";
import { authMiddleware, adminMiddleware, AuthRequest } from "../../middleware/auth.middleware.js";
import { UserController } from "../../controllers/user.controller.js";

const router = Router();
const ctrl = container.resolve(AdminController);
const stickerCtrl = container.resolve(StickerController);
const supplierCtrl = container.resolve(SupplierController);
const user = container.resolve(UserController);

const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthRequest, res, next).catch(next);

router.patch("/admin/users/:id/status", adminMiddleware, asyncHandler((req, res) => ctrl.updateUserStatus(req, res)));
router.get("/admin/stickers", authMiddleware, asyncHandler((req, res) => stickerCtrl.list(req, res)));
router.post("/admin/stickers", adminMiddleware, asyncHandler((req, res) => stickerCtrl.create(req, res)));
router.delete("/admin/stickers/:id", adminMiddleware, asyncHandler((req, res) => stickerCtrl.remove(req, res)));
router.get("/admin/users", adminMiddleware, asyncHandler((req, res) => user.getUserList(req, res)));
router.get("/admin/suppliers", adminMiddleware, asyncHandler((req, res) => supplierCtrl.getSupplierList(req, res)));
router.get("/admin/suppliers/:id", adminMiddleware, asyncHandler((req, res) => supplierCtrl.getSupplierById(req, res)));
router.patch("/admin/suppliers/:id", adminMiddleware, asyncHandler((req, res) => supplierCtrl.updateSupplier(req, res)));
router.patch("/admin/suppliers/:id/status", adminMiddleware, asyncHandler((req, res) => supplierCtrl.updateSupplierStatus(req, res)));

export default router;
