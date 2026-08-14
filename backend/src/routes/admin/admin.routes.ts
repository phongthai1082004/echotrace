import { container } from "tsyringe";
import { Router, Request, Response, NextFunction } from "express";
import { AdminController } from "../../controllers/admin.controller.js";
import { StickerController } from "../../controllers/sticker.controller.js";
import { SupplierController } from "../../controllers/supplier.controller.js";
import { CouponController } from "../../controllers/coupon.controller.js";
import { authMiddleware, adminMiddleware, AuthRequest } from "../../middleware/auth.middleware.js";
import { UserController } from "../../controllers/user.controller.js";
import { SampleBookController } from "../../controllers/sample-book.controller.js";
import { validateDto } from "../../middleware/validator.middleware.js";
import { CreateSupplierDTO } from "../../dto/supplier/supplier.create.dto.js";
import { UpdateSupplierDTO } from "../../dto/supplier/supplier.update.dto.js";
import { CreateCouponDTO } from "../../dto/coupon/coupon.create.dto.js";

const router = Router();
const ctrl = container.resolve(AdminController);
const stickerCtrl = container.resolve(StickerController);
const supplierCtrl = container.resolve(SupplierController);
const couponCtrl = container.resolve(CouponController);
const user = container.resolve(UserController);
const sampleBookCtrl = container.resolve(SampleBookController);

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
router.patch("/admin/suppliers/:id/info", adminMiddleware, validateDto(UpdateSupplierDTO), asyncHandler((req, res) => supplierCtrl.updateSupplierInfo(req, res)));
router.patch("/admin/suppliers/:id/options", adminMiddleware, asyncHandler((req, res) => supplierCtrl.updateSupplierOptions(req, res)));
router.patch("/admin/suppliers/:id", adminMiddleware, validateDto(UpdateSupplierDTO), asyncHandler((req, res) => supplierCtrl.updateSupplier(req, res)));
router.patch("/admin/suppliers/:id/status", adminMiddleware, asyncHandler((req, res) => supplierCtrl.updateSupplierStatus(req, res)));
router.post("/admin/suppliers", adminMiddleware, validateDto(CreateSupplierDTO), asyncHandler((req, res) => supplierCtrl.createSupplier(req, res)));
router.delete("/admin/suppliers/:id", adminMiddleware, asyncHandler((req, res) => supplierCtrl.deleteSupplier(req, res)));
router.get("/admin/coupons", adminMiddleware, asyncHandler((req, res) => couponCtrl.list(req, res)));
router.post("/admin/coupons", adminMiddleware, validateDto(CreateCouponDTO), asyncHandler((req, res) => couponCtrl.create(req, res)));
router.delete("/admin/coupons/:id", adminMiddleware, asyncHandler((req, res) => couponCtrl.remove(req, res)));

router.get("/admin/sample-books", adminMiddleware, asyncHandler((req, res) => sampleBookCtrl.list(req, res)));
router.get("/admin/sample-books/:id", adminMiddleware, asyncHandler((req, res) => sampleBookCtrl.getById(req, res)));
router.post("/admin/sample-books", adminMiddleware, asyncHandler((req, res) => sampleBookCtrl.create(req, res)));
router.patch("/admin/sample-books/:id", adminMiddleware, asyncHandler((req, res) => sampleBookCtrl.update(req, res)));
router.delete("/admin/sample-books/:id", adminMiddleware, asyncHandler((req, res) => sampleBookCtrl.remove(req, res)));

export default router;
