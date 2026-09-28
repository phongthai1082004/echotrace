import { container } from 'tsyringe';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { Router, Request, Response, NextFunction } from 'express';
import { SampleBookController } from './sample-books.controller.js';
import { authGuard, AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { validateDto } from '../../../shared/middleware/validator.middleware.js';
import { CreateSampleBookDTO, UpdateSampleBookDTO, UpdateSampleBookStatusDTO } from '@echotrace/shared';

const router = Router();
const sampleBookCtrl = container.resolve(SampleBookController);


router.get(
	'/admin/sample-books',
	authGuard('admin'),
	asyncHandler((req, res) => sampleBookCtrl.list(req, res)),
);
router.get(
	'/admin/sample-books/:id',
	authGuard('admin'),
	asyncHandler((req, res) => sampleBookCtrl.getById(req, res)),
);
router.post(
	'/admin/sample-books',
	authGuard('admin'),
	validateDto(CreateSampleBookDTO),
	asyncHandler((req, res) => sampleBookCtrl.create(req, res)),
);
router.patch(
	'/admin/sample-books/:id',
	authGuard('admin'),
	validateDto(UpdateSampleBookDTO),
	asyncHandler((req, res) => sampleBookCtrl.update(req, res)),
);
// Alias POST cho sendBeacon lúc đóng tab (beacon không đổi method được).
router.post(
	'/admin/sample-books/:id',
	authGuard('admin'),
	validateDto(UpdateSampleBookDTO),
	asyncHandler((req, res) => sampleBookCtrl.update(req, res)),
);
router.patch(
	'/admin/sample-books/:id/status',
	authGuard('admin'),
	validateDto(UpdateSampleBookStatusDTO),
	asyncHandler((req, res) => sampleBookCtrl.updateStatus(req, res)),
);
router.delete(
	'/admin/sample-books/:id',
	authGuard('admin'),
	asyncHandler((req, res) => sampleBookCtrl.remove(req, res)),
);

router.get(
	'/explore/samples',
	authGuard(),
	asyncHandler((req, res) => sampleBookCtrl.explore(req, res)),
);
router.get(
	'/explore/albums',
	authGuard(),
	asyncHandler((req, res) => sampleBookCtrl.albums(req, res)),
);
router.get(
	'/user/sample-books/:id',
	authGuard(),
	asyncHandler((req, res) => sampleBookCtrl.getPublishedById(req, res)),
);

export default router;
