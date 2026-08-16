import { container } from "tsyringe";
import { Router, Request, Response, NextFunction } from "express";
import { UserController } from "./users.controller.js";
import { authMiddleware, adminMiddleware, AuthRequest } from "../../middleware/auth.middleware.js";

const router = Router();
const user = container.resolve(UserController);

const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthRequest, res, next).catch(next);

router.use("/user", authMiddleware);
router.get("/user/profile", asyncHandler((req, res) => user.getProfile(req, res)));
router.put("/user/profile", asyncHandler((req, res) => user.updateProfile(req, res)));
router.put("/user/change-password", asyncHandler((req, res) => user.changePassword(req, res)));

router.get("/admin/users", adminMiddleware, asyncHandler((req, res) => user.getUserList(req, res)));
router.patch("/admin/users/:id/status", adminMiddleware, asyncHandler((req, res) => user.updateUserStatus(req, res)));

export default router;