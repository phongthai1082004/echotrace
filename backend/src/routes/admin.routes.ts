import { Router, Request, Response, NextFunction } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";

const router = Router();
const ctrl = new AdminController();

const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthRequest, res, next).catch(next);

router.use(authMiddleware);

router.get("/admin/users", asyncHandler((req, res) => ctrl.listUsers(req, res)));
router.patch("/admin/users/:id/status", asyncHandler((req, res) => ctrl.updateUserStatus(req, res)));

export default router;
