import { injectable } from 'tsyringe';
import type { Response } from 'express';

// Single-instance là đủ (hiện tại 1 container); scale nhiều instance thì lót
// Redis pub/sub giữa notify và sendTo. Fail-open mọi chỗ: push lỗi không chặn notify.
@injectable()
export class PresenceService {
	private conns = new Map<number, Set<Response>>();
	private timer: NodeJS.Timeout | null = null;

	add(userId: number, res: Response): void {
		let set = this.conns.get(userId);
		if (!set) {
			set = new Set();
			this.conns.set(userId, set);
		}
		set.add(res);
		if (!this.timer) {
			this.timer = setInterval(() => this.beat(), 25_000);
			this.timer.unref?.();
		}
	}

	remove(userId: number, res: Response): void {
		const set = this.conns.get(userId);
		if (!set) return;
		set.delete(res);
		if (set.size === 0) this.conns.delete(userId);
	}

	online(userId: number): boolean {
		return (this.conns.get(userId)?.size ?? 0) > 0;
	}

	// offline → false, caller bỏ qua (DB vẫn là source of truth)
	sendTo(userId: number, event: string): boolean {
		const set = this.conns.get(userId);
		if (!set || set.size === 0) return false;
		let ok = false;
		for (const res of set) {
			try {
				if (!res.writableEnded) {
					res.write(`data: ${event}\n\n`);
					ok = true;
				}
			} catch {
				this.remove(userId, res);
			}
		}
		return ok;
	}

	private beat(): void {
		for (const [userId, set] of this.conns) {
			for (const res of set) {
				try {
					if (res.writableEnded) this.remove(userId, res);
					else res.write(': ping\n\n');
				} catch {
					this.remove(userId, res);
				}
			}
		}
	}
}
