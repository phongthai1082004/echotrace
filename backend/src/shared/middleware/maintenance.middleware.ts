import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from './api.response.js';
import { getMaintenanceStatus } from '../maintenance/maintenance.service.js';

// ponytail: chặn API khi bảo trì, trừ: health, PayOS webhook (tiền vẫn chạy),
// login/auth (admin cần vào), /api/admin (authGuard bên trong vẫn chặn non-admin),
// status endpoint (frontend proxy đọc, không auth). Cờ nằm trong DB nên
// rebuild container không mất. Fail-open khi DB lỗi.
const ALLOW = ['/health', '/api/payments/webhooks', '/api/maintenance/status', '/api/auth/', '/api/admin/'];

export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction) {
	try {
		if (!(await getMaintenanceStatus()).active) return next();
		const path = req.path || '';
		if (ALLOW.some((p) => path === p || path.startsWith(p) || path.includes(p))) return next();
		res.setHeader('Retry-After', '300');
		res.status(503).json(ApiResponse.error('Service is under maintenance', 503));
	} catch {
		next(); // fail-open
	}
}
