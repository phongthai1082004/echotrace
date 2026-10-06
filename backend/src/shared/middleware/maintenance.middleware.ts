import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from './api.response.js';
import { getMaintenanceStatus } from '../maintenance/maintenance.service.js';

// Login/auth must stay reachable (admins need in), /api/admin is still guarded
// internally by authGuard; the status endpoint is read by the frontend proxy
// without auth. The flag lives in DB so container rebuilds don't lose it.
// Fail-open on DB errors.
const ALLOW = ['/health', '/api/payments/webhooks', '/api/maintenance/status', '/api/auth/', '/api/admin/'];

export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction) {
	try {
		if (!(await getMaintenanceStatus()).active) return next();
		const path = req.path || '';
		if (ALLOW.some((p) => path === p || path.startsWith(p))) return next();
		res.setHeader('Retry-After', '300');
		res.status(503).json(ApiResponse.error('Service is under maintenance', 503));
	} catch {
		next(); // fail-open
	}
}
