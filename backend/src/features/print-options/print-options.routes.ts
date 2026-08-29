import { container } from 'tsyringe';
import { asyncHandler } from '../../middleware/async-handler.js';
import { Router, Request, Response, NextFunction } from 'express';
import { PrintOptionController } from './print-options.controller.js';
import { authGuard, AuthRequest } from '../../middleware/auth.middleware.js';
import { validateDto } from '../../middleware/validator.middleware.js';
import { CreatePrintOptionDTO } from '@echotrace/shared';
import { UpdatePrintOptionDTO } from '@echotrace/shared';

const router = Router();
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