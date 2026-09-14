import { container } from 'tsyringe';
import { Router } from 'express';
import { ProfileController } from './profile.controller.js';
import { route } from '../../../shared/middleware/route.js';

const router = Router();
const profile = container.resolve(ProfileController);

route(router, 'get', '/user/profile', (req, res) => profile.getProfile(req, res), { auth: true });
route(router, 'put', '/user/profile', (req, res) => profile.updateProfile(req, res), { auth: true });
route(router, 'put', '/user/change-password', (req, res) => profile.changePassword(req, res), { auth: true });
route(router, 'post', '/user/attribution', (req, res) => profile.stampAttribution(req, res), { auth: true });

export default router;
