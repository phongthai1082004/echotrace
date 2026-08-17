import { container } from "tsyringe";
import { Router, Request, Response, NextFunction } from "express";
import { SampleBookController } from "./sample-books.controller.js";
import { authMiddleware, adminMiddleware, AuthRequest } from "../../middleware/auth.middleware.js";

const router = Router();
const sampleBookCtrl = container.resolve(SampleBookController);

const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthRequest, res, next).catch(next);

router.get("/admin/sample-books", adminMiddleware, asyncHandler((req, res) => sampleBookCtrl.list(req, res)));
router.get("/admin/sample-books/:id", adminMiddleware, asyncHandler((req, res) => sampleBookCtrl.getById(req, res)));
router.post("/admin/sample-books", adminMiddleware, asyncHandler((req, res) => sampleBookCtrl.create(req, res)));
router.patch("/admin/sample-books/:id", adminMiddleware, asyncHandler((req, res) => sampleBookCtrl.update(req, res)));
router.patch("/admin/sample-books/:id/status", adminMiddleware, asyncHandler((req, res) => sampleBookCtrl.updateStatus(req, res)));
router.delete("/admin/sample-books/:id", adminMiddleware, asyncHandler((req, res) => sampleBookCtrl.remove(req, res)));

router.get("/explore/samples", authMiddleware, asyncHandler((req, res) => sampleBookCtrl.explore(req, res)));
router.get("/explore/albums", authMiddleware, asyncHandler((req, res) => sampleBookCtrl.albums(req, res)));
router.get("/user/sample-books/:id", authMiddleware, asyncHandler((req, res) => sampleBookCtrl.getPublishedById(req, res)));

export default router;