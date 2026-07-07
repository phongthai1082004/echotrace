import { Router, Request, Response, NextFunction } from "express";
import { UserController } from "../controllers/user.controller.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware.js";

const router = Router();
const user = new UserController();

const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthRequest, res, next).catch(next);

router.use(authMiddleware);

router.get("/profile", asyncHandler((req, res) => user.getProfile(req, res)));
router.put("/profile", asyncHandler((req, res) => user.updateProfile(req, res)));
router.get("/books", asyncHandler((req, res) => user.getMyBooks(req, res)));
router.get("/users", asyncHandler((req, res) => user.getUsers(req, res)));
router.get("/users/:userId/books", asyncHandler((req, res) => user.getOtherUserBooks(req, res)));

export default router;
