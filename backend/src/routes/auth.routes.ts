import { Router, Request, Response, NextFunction } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();
const auth = new AuthController();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

router.post("/google",     asyncHandler((req, res) => auth.googleLogin(req, res)));
router.post("/send-otp",   asyncHandler((req, res) => auth.sendOtp(req, res)));
router.post("/verify-otp", asyncHandler((req, res) => auth.verifyOtp(req, res)));
router.post("/login",      asyncHandler((req, res) => auth.login(req, res)));
router.post("/logout",     authMiddleware, asyncHandler((req, res) => auth.logout(req, res)));
router.post("/refresh",    asyncHandler((req, res) => auth.refresh(req, res)));

export default router;
