import { Router, Request, Response, NextFunction } from "express";
import { AdminController } from "../../controllers/admin.controller.js";
import { StickerController } from "../../controllers/sticker.controller.js";
import { authMiddleware, adminMiddleware, AuthRequest } from "../../middleware/auth.middleware.js";

const router = Router();
const ctrl = new AdminController();
const stickerCtrl = new StickerController();

const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthRequest, res, next).catch(next);

router.patch("/admin/users/:id/status", adminMiddleware, asyncHandler((req, res) => ctrl.updateUserStatus(req, res)));
router.get("/admin/stickers", authMiddleware, asyncHandler((req, res) => stickerCtrl.list(req, res)));
router.post("/admin/stickers", adminMiddleware, asyncHandler((req, res) => stickerCtrl.create(req, res)));
router.delete("/admin/stickers/:id", adminMiddleware, asyncHandler((req, res) => stickerCtrl.remove(req, res)));

export default router;
