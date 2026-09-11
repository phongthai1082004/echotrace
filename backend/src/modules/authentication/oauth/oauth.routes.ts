import { container } from 'tsyringe';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { Router } from 'express';
import { OAuthController } from './oauth.controller.js';
import { authLimiter } from '../shared/rate-limit.js';

const router = Router();
const oauth = container.resolve(OAuthController);

router.post(
	'/google',
	authLimiter,
	asyncHandler((req, res) => oauth.googleLogin(req, res)),
);

export default router;
