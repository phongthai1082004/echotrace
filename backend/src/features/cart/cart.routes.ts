import { container } from 'tsyringe';
import { asyncHandler } from '../../middleware/async-handler.js';
import { Router, Request, Response, NextFunction } from 'express';
import { CartController } from './cart.controller.js';
import { authGuard, AuthRequest } from '../../middleware/auth.middleware.js';

const router = Router();
const cartCtrl = container.resolve(CartController);


router.use(authGuard());

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
