/**
 * Shared `run()` — drive a DTO class through the real `validateDto` middleware:
 * plainToInstance + class-validator whitelist + grouped `errors{field: msg[]}` shape.
 */
import { validateDto } from '../../src/shared/middleware/validator.middleware.js';
import type { Request, Response, NextFunction } from 'express';

export type RunResult = { forwarded: any; error: { errorCode: string; statusCode: number; details?: any } | null };

export async function run(dtoClass: any, body: any): Promise<RunResult> {
	let forwarded: any = null;
	let captured: RunResult['error'] = null;
	const req = { body, i18n: { t: (_k: string, o: any) => o?.defaultValue ?? _k } } as unknown as Request;
	const next: NextFunction = (arg?: any) => {
		if (arg) captured = { errorCode: arg.errorCode, statusCode: arg.statusCode, details: arg.details };
		else forwarded = (req as any).body;
	};
	await validateDto(dtoClass)(req, {} as Response, next);
	return { forwarded, error: captured };
}
