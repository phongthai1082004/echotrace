import { container } from 'tsyringe';
import { Router, Request, Response, NextFunction } from 'express';
import { PrintOptionController } from './print-options.controller.js';
import { adminMiddleware, AuthRequest } from '../../middleware/auth.middleware.js';
import { validateDto } from '../../middleware/validator.middleware.js';
import { CreatePrintOptionDTO } from '../../dto/print-option/print-option.create.dto.js';
import { UpdatePrintOptionDTO } from '../../dto/print-option/print-option.update.dto.js';

const router = Router();
const printOptionCtrl = container.resolve(PrintOptionController);

const asyncHandler =
	(fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) => (req: Request, res: Response, next: NextFunction) =>
		fn(req as AuthRequest, res, next).catch(next);

router.get(
	'/admin/print-options',
	adminMiddleware,
	asyncHandler((req, res) => printOptionCtrl.list(req, res)),
);
router.post(
	'/admin/print-options',
	adminMiddleware,
	validateDto(CreatePrintOptionDTO),
	asyncHandler((req, res) => printOptionCtrl.create(req, res)),
);
router.patch(
	'/admin/print-options/:id',
	adminMiddleware,
	validateDto(UpdatePrintOptionDTO),
	asyncHandler((req, res) => printOptionCtrl.update(req, res)),
);
router.delete(
	'/admin/print-options/:id',
	adminMiddleware,
	asyncHandler((req, res) => printOptionCtrl.remove(req, res)),
);

export default router;