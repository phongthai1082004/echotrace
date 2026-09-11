import { container } from 'tsyringe';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { Router, Request, Response, NextFunction } from 'express';
import { UploadController } from './uploads.controller.js';
import { authGuard, AuthRequest } from '../../../shared/middleware/auth.middleware.js';

const router = Router();
const uploadCtrl = container.resolve(UploadController);


router.use(authGuard());

router.get(
	'/get-upload-signature',
	asyncHandler((req, res) => uploadCtrl.getSignature(req, res)),
);
router.post(
	'/uploads/image',
	asyncHandler((req, res) => uploadCtrl.saveImage(req, res)),
);
router.get(
	'/uploads/images',
	asyncHandler((req, res) => uploadCtrl.listImages(req, res)),
);
router.delete(
	'/uploads/images/:id',
	asyncHandler((req, res) => uploadCtrl.deleteImage(req, res)),
);

export default router;
