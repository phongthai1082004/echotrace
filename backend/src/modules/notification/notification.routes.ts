import { container } from 'tsyringe';
import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { route } from '../../shared/middleware/route.js';
import { BroadcastNotificationDTO } from '@echotrace/shared';
import { apiLimiter } from '../authentication/shared/rate-limit.js';

const router = Router();
router.use(apiLimiter);
const ctrl = container.resolve(NotificationController);

route(router, 'get', '/notifications', (req, res) => ctrl.list(req, res), { auth: true });
route(router, 'patch', '/notifications/:id/read', (req, res) => ctrl.markRead(req, res), { auth: true });
route(router, 'patch', '/notifications/:id/unread', (req, res) => ctrl.markUnread(req, res), { auth: true });
route(router, 'get', '/notifications/stream', (req, res) => ctrl.stream(req, res), { auth: true });
route(router, 'post', '/admin/notifications/broadcast', (req, res) => ctrl.broadcast(req, res), {
	auth: ['admin'],
	dto: BroadcastNotificationDTO,
});

export default router;
