import { AppError } from './app.error.js';
import { ErrorCode } from '@echotrace/shared';

export function parseId(value: unknown): number {
	const n = typeof value === 'number' ? value : Number(String(value ?? ''));
	if (!Number.isInteger(n) || n <= 0) throw new AppError(ErrorCode.VALIDATION_FAILED, 400, { id: ['invalid id'] });
	return n;
}

export function parseLimit(value: unknown, def: number | undefined = 20, max = 100): number | undefined {
	const n = Number(value);
	if (value === undefined || !Number.isFinite(n)) return def;
	return Math.min(max, Math.max(1, Math.floor(n)));
}

export function parseOrder(value: unknown, fallback: 'asc' | 'desc' = 'desc'): 'asc' | 'desc' {
	return value === 'asc' || value === 'desc' ? value : fallback;
}

export function parseField<T extends string>(value: unknown, allowed: readonly T[], fallback?: T): T | undefined {
	return (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

// cap strings at trust boundary — service/DB never sees a 10MB name
export function asString(value: unknown, max = 500): string | undefined {
	if (typeof value !== 'string') return undefined;
	const s = value.trim();
	if (!s) return undefined;
	return s.length > max ? s.slice(0, max) : s;
}
