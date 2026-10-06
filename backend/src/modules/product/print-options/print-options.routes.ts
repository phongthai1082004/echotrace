import { container } from 'tsyringe';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { Router, Request, Response, NextFunction } from 'express';
import { PrintOptionController } from './print-options.controller.js';
import { authGuard, AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { validateDto } from '../../../shared/middleware/validator.middleware.js';
import { CreatePrintOptionDTO } from '@echotrace/shared';
import { UpdatePrintOptionDTO } from '@echotrace/shared';
import { apiLimiter } from '../../authentication/shared/rate-limit.js';

const router = Router();
router.use(apiLimiter);
const printOptionCtrl = container.resolve(PrintOptionController);


router.get(
	'/admin/print-options',
	authGuard('admin'),
	asyncHandler((req, res) => printOptionCtrl.list(req, res)),
);
router.post(
	'/admin/print-options',
	authGuard('admin'),
	validateDto(CreatePrintOptionDTO),
	asyncHandler((req, res) => printOptionCtrl.create(req, res)),
);
router.patch(
	'/admin/print-options/:id',
	authGuard('admin'),
	validateDto(UpdatePrintOptionDTO),
	asyncHandler((req, res) => printOptionCtrl.update(req, res)),
);
router.delete(
	'/admin/print-options/:id',
	authGuard('admin'),
	asyncHandler((req, res) => printOptionCtrl.remove(req, res)),
);

export default router;