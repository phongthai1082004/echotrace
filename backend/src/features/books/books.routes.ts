import { container } from "tsyringe";
import { Router, Request, Response, NextFunction } from "express";
import { BookController } from "./books.controller.js";
import { authMiddleware, AuthRequest } from "../../middleware/auth.middleware.js";

const router = Router();
const bookCtrl = container.resolve(BookController);

const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthRequest, res, next).catch(next);

router.use(authMiddleware);

router.get("/books/:id", asyncHandler((req, res) => bookCtrl.getById(req, res)));
router.get("/user/my-books", asyncHandler((req, res) => bookCtrl.getMyBooks(req, res)));
router.post("/books", asyncHandler((req, res) => bookCtrl.create(req, res)));
router.delete("/books/:id", asyncHandler((req, res) => bookCtrl.remove(req, res)));
router.patch("/books/:id/pages", asyncHandler((req, res) => bookCtrl.updatePages(req, res)));

export default router;