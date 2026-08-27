import { Router, Request, Response, NextFunction } from 'express';
import { FinanceController } from './finance.controller.js';
import { adminMiddleware, AuthRequest } from '../../middleware/auth.middleware.js';
import { container } from '../../di/container.js';

const router = Router();
const ctrl = container.resolve(FinanceController);

const asyncHandler =
	(fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) =>
	(req: Request, res: Response, next: NextFunction) =>
		fn(req as AuthRequest, res, next).catch(next);

router.get('/admin/financial/summary', adminMiddleware, asyncHandler((req, res) => ctrl.getSummary(req as AuthRequest, res)));
router.get('/admin/financial/suppliers', adminMiddleware, asyncHandler((req, res) => ctrl.getSuppliers(req as AuthRequest, res)));
router.post('/admin/financial/expenses', adminMiddleware, asyncHandler((req, res) => ctrl.createExpense(req as AuthRequest, res)));
router.get('/admin/financial/income', adminMiddleware, asyncHandler((req, res) => ctrl.listIncome(req as AuthRequest, res)));
router.get('/admin/financial/expense', adminMiddleware, asyncHandler((req, res) => ctrl.listExpense(req as AuthRequest, res)));
router.get('/admin/financial/cashflow', adminMiddleware, asyncHandler((req, res) => ctrl.listCashflow(req as AuthRequest, res)));

export default router;
