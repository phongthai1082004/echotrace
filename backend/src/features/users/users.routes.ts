import { container } from 'tsyringe';
import { Router } from 'express';
import { UserController } from './users.controller.js';
import { route } from '../../middleware/route.js';

const router = Router();
const user = container.resolve(UserController);

route(router, 'get', '/user/profile', (req, res) => user.getProfile(req, res), { auth: true });
route(router, 'put', '/user/profile', (req, res) => user.updateProfile(req, res), { auth: true });
route(router, 'put', '/user/change-password', (req, res) => user.changePassword(req, res), { auth: true });
route(router, 'get', '/admin/users', (req, res) => user.getUserList(req, res), { auth: ['admin'] });
route(router, 'patch', '/admin/users/:id/status', (req, res) => user.updateUserStatus(req, res), { auth: ['admin'] });

export default router;
