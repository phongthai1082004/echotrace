import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authGuard, AuthRequest } from '../middleware/auth.middleware.js';
import { ApiResponse } from '../middleware/api.response.js';
import { AppError } from '../middleware/app.error.js';
import { ErrorCode } from '@echotrace/shared';
import {
	getMaintenanceStatus,
	startMaintenanceNow,
	stopMaintenanceNow,
	scheduleMaintenance,
	listMaintenanceHistory,
} from './maintenance.service.js';

// ponytail: bảo trì trong DB — status public (frontend proxy đọc, không auth),
// còn lại chỉ admin. Validate: ISO hợp lệ, endAt > startAt, endAt tương lai,
// cửa sổ tối đa 24h (chống gõ nhầm năm khóa khách tới 2030).
const router = Router();
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

router.get('/maintenance/status', asyncHandler(async (_req, res) => {
	res.json(ApiResponse.success(await getMaintenanceStatus()));
}));

router.get('/admin/maintenance', authGuard('admin'), asyncHandler(async (_req, res) => {
	const [s, history] = await Promise.all([getMaintenanceStatus(), listMaintenanceHistory(10)]);
	res.json(ApiResponse.success({ ...s, history }));
}));

router.post('/admin/maintenance', authGuard('admin'), asyncHandler(async (req, res) => {
	const body = (req.body as any) ?? {};
	const by = (req as AuthRequest).userId;
	const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) || null : null;
	if (body.enabled === true) {
		res.json(ApiResponse.success(await startMaintenanceNow(by, reason)));
		return;
	}
	if (body.enabled === false) {
		res.json(ApiResponse.success(await stopMaintenanceNow(by)));
		return;
	}
	const t0 = Date.parse(body.startAt);
	const t1 = Date.parse(body.endAt);
	if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0 || t1 <= Date.now() || t1 - t0 > MAX_WINDOW_MS) {
		throw new AppError(ErrorCode.VALIDATION_FAILED, 400);
	}
	res.json(ApiResponse.success(await scheduleMaintenance(new Date(t0), new Date(t1), by, reason)));
}));

export default router;