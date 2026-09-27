import { container } from '../../di/container.js';
import { PrismaService } from '../../../lib/db.service.js';
import { NotificationType, ErrorCode } from '@echotrace/shared';
import { AppError } from '../middleware/app.error.js';
import { broadcastNotification } from '../../modules/notification/notify/broadcast.js';

const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface MaintenanceWindowDTO {
	id: number;
	startAt: string;
	endAt: string | null;
	reason: string | null;
	status: string;
	createdAt: string;
	endedAt: string | null;
}

export interface MaintenanceStatus {
	active: boolean;
	window: MaintenanceWindowDTO | null;
}

function db() {
	return container.resolve(PrismaService).db;
}

function pick(r: any): MaintenanceWindowDTO {
	return {
		id: r.id,
		startAt: r.startAt.toISOString(),
		endAt: r.endAt ? r.endAt.toISOString() : null,
		reason: r.reason,
		status: r.status,
		createdAt: r.createdAt.toISOString(),
		endedAt: r.endedAt ? r.endedAt.toISOString() : null,
	};
}

// Cờ đổi vài lần/năm, trễ vài phút chấp nhận được (để Neon ngủ: cache 5'.
// Cần ăn ngay thì restart backend — write path đã xóa cache này).
let statusCache: { at: number; value: MaintenanceStatus } | null = null;
export function clearMaintenanceStatusCache(): void {
	statusCache = null;
}

// tự lật completed nên làm sớm quên tắt cũng tự mở lại. Redis reset không ảnh hưởng.
export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
	if (statusCache && Date.now() - statusCache.at < 300_000) return statusCache.value;
	const now = new Date();
	const rows = await db().maintenanceWindow.findMany({
		where: { status: { in: ['scheduled', 'active'] } },
		orderBy: { id: 'desc' },
		take: 10,
	});
	const covers = (r: any) => r.startAt <= now && (!r.endAt || r.endAt >= now);
	const live = rows.find(covers);
	if (live) {
		if (live.status === 'scheduled') {
			const flipped = await db().maintenanceWindow.updateMany({
				where: { id: live.id, notifiedAt: null },
				data: { status: 'active', notifiedAt: now },
			}).catch(() => ({ count: 0 }));
			if (flipped.count > 0) {
				await broadcastNotification({
					type: NotificationType.SYSTEM,
					title: 'Shop đang bảo trì',
					message: `<p>Shop đang bảo trì${live.reason ? `: ${live.reason}` : ''}. Quay lại sau vài phút nhé.</p>`,
					metadata: { maintenanceId: live.id },
				});
			}
		}
		const value: MaintenanceStatus = { active: true, window: pick({ ...live, status: 'active' }) };
		statusCache = { at: Date.now(), value };
		return value;
	}
	// dọn các cửa sổ đã qua mà chưa đóng
	await db().maintenanceWindow.updateMany({
		where: { status: { in: ['scheduled', 'active'] }, endAt: { lt: now } },
		data: { status: 'completed', endedAt: now },
	}).catch(() => {});
	const value: MaintenanceStatus = { active: false, window: null };
	statusCache = { at: Date.now(), value };
	return value;
}

// bật tay ngay — hủy các lịch đang chờ/dang dở (bật tay đè lịch hẹn)
export async function startMaintenanceNow(by?: string, reason?: string | null): Promise<MaintenanceStatus> {
	const now = new Date();
	await db().maintenanceWindow.updateMany({
		where: { status: { in: ['scheduled', 'active'] } },
		data: { status: 'cancelled', endedAt: now },
	}).catch(() => {});
	const r = await db().maintenanceWindow.create({
		data: { startAt: now, endAt: null, reason: reason?.slice(0, 500) ?? null, status: 'active', notifiedAt: now, createdBy: by ? parseInt(by) : null },
	});
	clearMaintenanceStatusCache();
	await broadcastNotification({
		type: NotificationType.SYSTEM,
		title: 'Shop đang bảo trì',
		message: `<p>Shop đang bảo trì${r.reason ? `: ${r.reason}` : ''}. Quay lại sau vài phút nhé.</p>`,
		metadata: { maintenanceId: r.id },
	});
	return { active: true, window: pick(r) };
}

// tắt ngay = nút "xong sớm" — đóng mọi cửa sổ đang live/chờ + báo mở lại
export async function stopMaintenanceNow(by?: string): Promise<MaintenanceStatus> {
	const now = new Date();
	await db().maintenanceWindow.updateMany({
		where: { status: { in: ['scheduled', 'active'] } },
		data: { status: 'completed', endedAt: now, endedBy: by ? parseInt(by) : null },
	}).catch(() => {});
	clearMaintenanceStatusCache();
	await broadcastNotification({
		type: NotificationType.SYSTEM,
		title: 'Shop đã mở lại',
		message: `<p>Bảo trì hoàn tất. Cảm ơn bạn đã chờ.</p>`,
	});
	return { active: false, window: null };
}

export async function scheduleMaintenance(startAt: Date, endAt: Date, by?: string, reason?: string | null) {
	// ISO hợp lệ, endAt > startAt, endAt tương lai, cửa sổ tối đa 24h (chống gõ nhầm năm)
	const t0 = startAt instanceof Date ? startAt.getTime() : NaN;
	const t1 = endAt instanceof Date ? endAt.getTime() : NaN;
	if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0 || t1 <= Date.now() || t1 - t0 > MAX_WINDOW_MS) {
		throw new AppError(ErrorCode.VALIDATION_FAILED, 400);
	}
	const r = await db().maintenanceWindow.create({
		data: { startAt, endAt, reason: reason?.slice(0, 500) ?? null, status: 'scheduled', createdBy: by ? parseInt(by) : null },
	});
	clearMaintenanceStatusCache();
	const fmt = (d: Date) => d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
	await broadcastNotification({
		type: NotificationType.SYSTEM,
		title: 'Sắp bảo trì shop',
		message: `<p>Shop sẽ bảo trì từ <b>${fmt(startAt)}</b> đến <b>${fmt(endAt)}</b>${r.reason ? ` (${r.reason})` : ''}.</p>`,
		metadata: { maintenanceId: r.id },
	});
	const now = new Date();
	const active = startAt <= now && endAt >= now;
	return { ...pick(r), active };
}

export async function listMaintenanceHistory(limit = 10) {
	const rows = await db().maintenanceWindow.findMany({ orderBy: { id: 'desc' }, take: Math.min(Math.max(limit, 1), 50) });
	return rows.map(pick);
}
