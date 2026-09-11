import { container } from 'tsyringe';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { Router, Request, Response, NextFunction } from 'express';
import { SupplierController } from './suppliers.controller.js';
import { authGuard, AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { validateDto } from '../../../shared/middleware/validator.middleware.js';
import { CreateSupplierDTO } from '@echotrace/shared';
import { UpdateSupplierDTO } from '@echotrace/shared';

const router = Router();
const supplierCtrl = container.resolve(SupplierController);


router.get(
	'/admin/suppliers',
	authGuard('admin'),
	asyncHandler((req, res) => supplierCtrl.getSupplierList(req, res)),
);
router.get(
	'/admin/supplier-options/catalog',
	authGuard('admin'),
	asyncHandler((req, res) => supplierCtrl.getOptionCatalog(req, res)),
);
router.get(
	'/admin/supplier-options/info',
	authGuard('admin'),
	asyncHandler((req, res) => supplierCtrl.getOptionInfo(req, res)),
);
router.get(
	'/admin/suppliers/:id',
	authGuard('admin'),
	asyncHandler((req, res) => supplierCtrl.getSupplierById(req, res)),
);
router.patch(
	'/admin/suppliers/:id/info',
	authGuard('admin'),
	validateDto(UpdateSupplierDTO),
	asyncHandler((req, res) => supplierCtrl.updateSupplierInfo(req, res)),
);
router.patch(
	'/admin/suppliers/:id/options',
	authGuard('admin'),
	asyncHandler((req, res) => supplierCtrl.updateSupplierOptions(req, res)),
);
router.patch(
	'/admin/suppliers/:id',
	authGuard('admin'),
	validateDto(UpdateSupplierDTO),
	asyncHandler((req, res) => supplierCtrl.updateSupplier(req, res)),
);
router.patch(
	'/admin/suppliers/:id/status',
	authGuard('admin'),
	asyncHandler((req, res) => supplierCtrl.updateSupplierStatus(req, res)),
);
router.post(
	'/admin/suppliers',
	authGuard('admin'),
	validateDto(CreateSupplierDTO),
	asyncHandler((req, res) => supplierCtrl.createSupplier(req, res)),
);
router.delete(
	'/admin/suppliers/:id',
	authGuard('admin'),
	asyncHandler((req, res) => supplierCtrl.deleteSupplier(req, res)),
);

router.get(
	'/user/suppliers/options',
	authGuard(),
	asyncHandler((req, res) => supplierCtrl.getAggregatedOptions(req, res)),
);

export default router;
