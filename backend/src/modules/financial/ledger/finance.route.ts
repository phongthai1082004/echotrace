import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { validateDto } from '../../../shared/middleware/validator.middleware.js';
import { CreateExpenseDTO } from '@echotrace/shared';
import { FinanceController } from './finance.controller.js';
import { authGuard, AuthRequest } from '../../../shared/middleware/auth.middleware.js';
import { container } from '../../../di/container.js';

const router = Router();
const ctrl = container.resolve(FinanceController);


router.get('/admin/financial/summary', authGuard('admin'), asyncHandler((req, res) => ctrl.getSummary(req as AuthRequest, res)));
router.get('/admin/financial/suppliers', authGuard('admin'), asyncHandler((req, res) => ctrl.getSuppliers(req as AuthRequest, res)));
router.post('/admin/financial/expenses', authGuard('admin'), validateDto(CreateExpenseDTO), asyncHandler((req, res) => ctrl.createExpense(req as AuthRequest, res)));
router.get('/admin/financial/income', authGuard('admin'), asyncHandler((req, res) => ctrl.listIncome(req as AuthRequest, res)));
router.get('/admin/financial/expense', authGuard('admin'), asyncHandler((req, res) => ctrl.listExpense(req as AuthRequest, res)));
router.get('/admin/financial/cashflow', authGuard('admin'), asyncHandler((req, res) => ctrl.listCashflow(req as AuthRequest, res)));

export default router;
