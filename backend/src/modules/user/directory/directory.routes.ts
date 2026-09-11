import { container } from 'tsyringe';
import { Router } from 'express';
import { DirectoryController } from './directory.controller.js';
import { route } from '../../../shared/middleware/route.js';

const router = Router();
const directory = container.resolve(DirectoryController);

route(router, 'get', '/admin/users', (req, res) => directory.getUserList(req, res), { auth: ['admin'] });
route(router, 'patch', '/admin/users/:id/status', (req, res) => directory.updateUserStatus(req, res), { auth: ['admin'] });

export default router;
