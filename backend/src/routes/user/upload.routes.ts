import { container } from "tsyringe";
import { Router, Request, Response, NextFunction } from "express";
import { UploadController } from "../../controllers/upload.controller.js";
import { authMiddleware, AuthRequest } from "../../middleware/auth.middleware.js";

const router = Router();
const uploadCtrl = container.resolve(UploadController);

const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthRequest, res, next).catch(next);

router.use(authMiddleware);

router.get("/get-upload-signature", asyncHandler((req, res) => uploadCtrl.getSignature(req, res)));
router.post("/uploads/image", asyncHandler((req, res) => uploadCtrl.saveImage(req, res)));
router.get("/uploads/images", asyncHandler((req, res) => uploadCtrl.listImages(req, res)));
router.delete("/uploads/images/:id", asyncHandler((req, res) => uploadCtrl.deleteImage(req, res)));

export default router;
