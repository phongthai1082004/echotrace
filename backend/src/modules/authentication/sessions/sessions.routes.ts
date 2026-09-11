import { container } from 'tsyringe';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { Router } from 'express';
import { SessionController } from './sessions.controller.js';
import { authGuard } from '../../../shared/middleware/auth.middleware.js';
import { authLimiter } from '../shared/rate-limit.js';

const router = Router();
const sessions = container.resolve(SessionController);

router.post(
	'/logout',
	authGuard(),
	asyncHandler((req, res) => sessions.logout(req, res)),
);
router.post(
	'/refresh',
	authLimiter,
	asyncHandler((req, res) => sessions.refresh(req, res)),
);

export default router;
