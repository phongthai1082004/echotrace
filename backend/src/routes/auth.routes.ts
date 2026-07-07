import { Router, Request, Response, NextFunction } from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = Router();
const auth = new AuthController();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

router.post("/google",   asyncHandler((req, res) => auth.googleLogin(req, res)));
router.post("/register", asyncHandler((req, res) => auth.register(req, res)));
router.post("/login",    asyncHandler((req, res) => auth.login(req, res)));
router.post("/logout",   asyncHandler((req, res) => auth.logout(req, res)));

export default router;
