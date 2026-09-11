import { container } from 'tsyringe';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { Router } from 'express';
import { PasswordController } from './password.controller.js';
import { authLimiter } from '../shared/rate-limit.js';

const router = Router();
const password = container.resolve(PasswordController);

router.post(
	'/login',
	authLimiter,
	asyncHandler((req, res) => password.login(req, res)),
);

export default router;
