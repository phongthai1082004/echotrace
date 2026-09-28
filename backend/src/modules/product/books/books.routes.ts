import { container } from 'tsyringe';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { Router, Request, Response, NextFunction } from 'express';
import { BookController } from './books.controller.js';
import { authGuard, AuthRequest } from '../../../shared/middleware/auth.middleware.js';

const router = Router();
const bookCtrl = container.resolve(BookController);


router.use(authGuard());

router.get(
	'/books/:id',
	asyncHandler((req, res) => bookCtrl.getById(req, res)),
);
router.get(
	'/user/my-books',
	asyncHandler((req, res) => bookCtrl.getMyBooks(req, res)),
);
router.post(
	'/books',
	asyncHandler((req, res) => bookCtrl.create(req, res)),
);
router.delete(
	'/books/:id',
	asyncHandler((req, res) => bookCtrl.remove(req, res)),
);
router.patch(
	'/books/:id/pages',
	asyncHandler((req, res) => bookCtrl.updatePages(req, res)),
);
// Alias POST cho sendBeacon lúc đóng tab (beacon không đổi method được).
router.post(
	'/books/:id/pages',
	asyncHandler((req, res) => bookCtrl.updatePages(req, res)),
);

export default router;
