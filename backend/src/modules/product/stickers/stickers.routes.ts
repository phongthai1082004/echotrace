import { container } from 'tsyringe';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { Router, Request, Response, NextFunction } from 'express';
import { StickerController } from './stickers.controller.js';
import { authGuard, AuthRequest } from '../../../shared/middleware/auth.middleware.js';

const router = Router();
const stickerCtrl = container.resolve(StickerController);


router.get(
	'/admin/stickers',
	authGuard(),
	asyncHandler((req, res) => stickerCtrl.list(req, res)),
);
router.post(
	'/admin/stickers',
	authGuard('admin'),
	asyncHandler((req, res) => stickerCtrl.create(req, res)),
);
router.delete(
	'/admin/stickers/:id',
	authGuard('admin'),
	asyncHandler((req, res) => stickerCtrl.remove(req, res)),
);

export default router;
