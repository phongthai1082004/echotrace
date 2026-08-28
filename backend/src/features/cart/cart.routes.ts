import { container } from 'tsyringe';
import { Router, Request, Response, NextFunction } from 'express';
import { CartController } from './cart.controller.js';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware.js';

const router = Router();
const cartCtrl = container.resolve(CartController);

const asyncHandler =
	(fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) => (req: Request, res: Response, next: NextFunction) =>
		fn(req as AuthRequest, res, next).catch(next);

router.use(authMiddleware);

router.get(
	'/cart',
	asyncHandler((req, res) => cartCtrl.getCart(req, res)),
);
router.post(
	'/cart/item',
	asyncHandler((req, res) => cartCtrl.addItem(req, res)),
);
router.post(
	'/cart/album',
	asyncHandler((req, res) => cartCtrl.addAlbum(req, res)),
);
router.patch(
	'/cart/item/:bookId',
	asyncHandler((req, res) => cartCtrl.patchItem(req, res)),
);
router.delete(
	'/cart/item/:bookId',
	asyncHandler((req, res) => cartCtrl.deleteItem(req, res)),
);
router.post(
	'/cart/calculate',
	asyncHandler((req, res) => cartCtrl.calculateCart(req, res)),
);

export default router;
