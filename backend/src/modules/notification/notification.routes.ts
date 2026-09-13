import { container } from 'tsyringe';
import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { route } from '../../shared/middleware/route.js';

const router = Router();
const ctrl = container.resolve(NotificationController);

route(router, 'get', '/notifications', (req, res) => ctrl.list(req, res), { auth: true });
route(router, 'patch', '/notifications/:id/read', (req, res) => ctrl.markRead(req, res), { auth: true });

export default router;
