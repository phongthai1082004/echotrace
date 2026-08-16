import { container } from "tsyringe";
import { Router, Request, Response, NextFunction } from "express";
import { StickerController } from "./stickers.controller.js";
import { authMiddleware, adminMiddleware, AuthRequest } from "../../middleware/auth.middleware.js";

const router = Router();
const stickerCtrl = container.resolve(StickerController);

const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthRequest, res, next).catch(next);

router.get("/admin/stickers", authMiddleware, asyncHandler((req, res) => stickerCtrl.list(req, res)));
router.post("/admin/stickers", adminMiddleware, asyncHandler((req, res) => stickerCtrl.create(req, res)));
router.delete("/admin/stickers/:id", adminMiddleware, asyncHandler((req, res) => stickerCtrl.remove(req, res)));

export default router;