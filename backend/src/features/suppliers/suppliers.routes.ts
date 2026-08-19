import { container } from 'tsyringe';
import { Router, Request, Response, NextFunction } from 'express';
import { SupplierController } from './suppliers.controller.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../../middleware/auth.middleware.js';
import { validateDto } from '../../middleware/validator.middleware.js';
import { CreateSupplierDTO } from '../../dto/supplier/supplier.create.dto.js';
import { UpdateSupplierDTO } from '../../dto/supplier/supplier.update.dto.js';

const router = Router();
const supplierCtrl = container.resolve(SupplierController);

const asyncHandler =
	(fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) => (req: Request, res: Response, next: NextFunction) =>
		fn(req as AuthRequest, res, next).catch(next);

router.get(
	'/admin/suppliers',
	adminMiddleware,
	asyncHandler((req, res) => supplierCtrl.getSupplierList(req, res)),
);
router.get(
	'/admin/supplier-options/catalog',
	adminMiddleware,
	asyncHandler((req, res) => supplierCtrl.getOptionCatalog(req, res)),
);
router.get(
	'/admin/supplier-options/info',
	adminMiddleware,
	asyncHandler((req, res) => supplierCtrl.getOptionInfo(req, res)),
);
router.get(
	'/admin/suppliers/:id',
	adminMiddleware,
	asyncHandler((req, res) => supplierCtrl.getSupplierById(req, res)),
);
router.patch(
	'/admin/suppliers/:id/info',
	adminMiddleware,
	validateDto(UpdateSupplierDTO),
	asyncHandler((req, res) => supplierCtrl.updateSupplierInfo(req, res)),
);
router.patch(
	'/admin/suppliers/:id/options',
	adminMiddleware,
	asyncHandler((req, res) => supplierCtrl.updateSupplierOptions(req, res)),
);
router.patch(
	'/admin/suppliers/:id',
	adminMiddleware,
	validateDto(UpdateSupplierDTO),
	asyncHandler((req, res) => supplierCtrl.updateSupplier(req, res)),
);
router.patch(
	'/admin/suppliers/:id/status',
	adminMiddleware,
	asyncHandler((req, res) => supplierCtrl.updateSupplierStatus(req, res)),
);
router.post(
	'/admin/suppliers',
	adminMiddleware,
	validateDto(CreateSupplierDTO),
	asyncHandler((req, res) => supplierCtrl.createSupplier(req, res)),
);
router.delete(
	'/admin/suppliers/:id',
	adminMiddleware,
	asyncHandler((req, res) => supplierCtrl.deleteSupplier(req, res)),
);

router.get(
	'/user/suppliers/options',
	authMiddleware,
	asyncHandler((req, res) => supplierCtrl.getAggregatedOptions(req, res)),
);

export default router;
