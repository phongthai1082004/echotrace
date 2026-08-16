import { container } from "tsyringe";
import { Router, Request, Response, NextFunction } from "express";
import { CartController } from "./cart.controller.js";
import { authMiddleware, AuthRequest } from "../../middleware/auth.middleware.js";

const router = Router();
const cartCtrl = container.resolve(CartController);

const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthRequest, res, next).catch(next);

router.use(authMiddleware);

router.get("/cart", asyncHandler((req, res) => cartCtrl.getCart(req, res)));
router.put("/cart", asyncHandler((req, res) => cartCtrl.updateCart(req, res)));

export default router;