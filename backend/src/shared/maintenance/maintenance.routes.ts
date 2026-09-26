import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authGuard, AuthRequest } from '../middleware/auth.middleware.js';
import { ApiResponse } from '../middleware/api.response.js';
import {
	getMaintenanceStatus,
	startMaintenanceNow,
	stopMaintenanceNow,
	scheduleMaintenance,
	listMaintenanceHistory,
} from './maintenance.service.js';

// còn lại chỉ admin. Validate nằm trong service.
const router = Router();

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
	res.json(ApiResponse.success(await scheduleMaintenance(new Date(t0), new Date(t1), by, reason)));
}));

export default router;