import { container } from "tsyringe";
import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { ErrorCode } from "@echotrace/shared";

const router = Router();
const auth = container.resolve(AuthController);

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: ErrorCode.TOO_MANY_REQUEST },
});

router.post("/google",     authLimiter, asyncHandler((req, res) => auth.googleLogin(req, res)));
router.post("/send-otp",   authLimiter, asyncHandler((req, res) => auth.sendOtp(req, res)));
router.post("/verify-otp", authLimiter, asyncHandler((req, res) => auth.verifyOtp(req, res)));
router.post("/login",      authLimiter, asyncHandler((req, res) => auth.login(req, res)));
router.post("/logout",     authMiddleware, asyncHandler((req, res) => auth.logout(req, res)));
router.post("/refresh",    authLimiter, asyncHandler((req, res) => auth.refresh(req, res)));

export default router;
