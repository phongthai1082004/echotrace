import { Router, Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest, authGuard } from './auth.middleware.js';
import { validateDto } from './validator.middleware.js';
import { asyncHandler } from './async-handler.js';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface RouteOptions {
	// true = bất kỳ user đã đăng nhập; string[] = role yêu cầu
	auth?: boolean | string[];
	dto?: new (...args: unknown[]) => object;
}

// ponytail: gom authGuard + validateDto + asyncHandler thành 1 call duy nhất,
// giảm lặp boilerplate ở mỗi route file.
export function route(
	router: Router,
	method: HttpMethod,
	path: string,
	handler: (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>,
	options: RouteOptions = {},
): void {
	const chain: RequestHandler[] = [];
	if (options.auth) {
		chain.push(authGuard(...(Array.isArray(options.auth) ? options.auth : [])));
	}
	if (options.dto) {
		chain.push(validateDto(options.dto));
	}
	chain.push(asyncHandler(handler));
	(router as unknown as Record<HttpMethod, (p: string, ...m: RequestHandler[]) => void>)[method](path, ...chain);
}
