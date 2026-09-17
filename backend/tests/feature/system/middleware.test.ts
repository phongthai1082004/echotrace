/**
 * Part 4 remainder — middleware base behavior.
 * - auth guard (missing/bad token → 401, wrong role → 403)
 * - error-code mapping (AppError passthrough, plain Error → 500 INTERNAL)
 * - DTO validator (pass replaces body, fail → 400 VALIDATION_FAILED)
 * - maintenance allowlist (webhook/auth/admin/health pass, rest 503 + Retry-After)
 */
import jwt from "jsonwebtoken";
import { IsString, MinLength } from "class-validator";
import { authMiddleware, authGuard } from "../../../src/shared/middleware/auth.middleware.js";
import { errorMiddleware } from "../../../src/shared/middleware/error.middleware.js";
import { validateDto } from "../../../src/shared/middleware/validator.middleware.js";
import { maintenanceMiddleware } from "../../../src/shared/middleware/maintenance.middleware.js";
import { AppError } from "../../../src/shared/middleware/app.error.js";
import { ErrorCode } from "@echotrace/shared";

jest.mock("../../../src/shared/maintenance/maintenance.service.js", () => ({
	getMaintenanceStatus: jest.fn(),
}));
import { getMaintenanceStatus } from "../../../src/shared/maintenance/maintenance.service.js";

const SECRET = "test-secret";
const OLD_ENV = process.env.JWT_ACCESS_SECRET;

beforeAll(() => {
	process.env.JWT_ACCESS_SECRET = SECRET;
});
afterAll(() => {
	if (OLD_ENV === undefined) delete process.env.JWT_ACCESS_SECRET;
	else process.env.JWT_ACCESS_SECRET = OLD_ENV;
});

const res = () => {
	const r: any = {};
	r.status = jest.fn().mockReturnValue(r);
	r.json = jest.fn().mockReturnValue(r);
	r.setHeader = jest.fn().mockReturnValue(r);
	return r;
};

const flush = () => new Promise((r) => setImmediate(r));

describe("auth guard", () => {
	it("missing token → 401 AUTH_MISSING_TOKEN", async () => {
		const next = jest.fn();
		await authMiddleware({ headers: {} } as any, res(), next);
		expect(next).toHaveBeenCalledWith(expect.objectContaining({ errorCode: ErrorCode.AUTH_MISSING_TOKEN, statusCode: 401 }));
	});

	it("non-Bearer scheme → 401 AUTH_MISSING_TOKEN", async () => {
		const next = jest.fn();
		await authMiddleware({ headers: { authorization: "Token abc" } } as any, res(), next);
		expect(next).toHaveBeenCalledWith(expect.objectContaining({ errorCode: ErrorCode.AUTH_MISSING_TOKEN, statusCode: 401 }));
	});

	it("bad token → 401 AUTH_TOKEN_EXPIRED", async () => {
		const next = jest.fn();
		await authMiddleware({ headers: { authorization: "Bearer not-a-jwt" } } as any, res(), next);
		expect(next).toHaveBeenCalledWith(expect.objectContaining({ errorCode: ErrorCode.AUTH_TOKEN_EXPIRED, statusCode: 401 }));
	});

	it("expired token → 401 AUTH_TOKEN_EXPIRED", async () => {
		const token = jwt.sign({ userId: "1", role: "user" }, SECRET, { expiresIn: "-10s" });
		const next = jest.fn();
		await authMiddleware({ headers: { authorization: `Bearer ${token}` } } as any, res(), next);
		expect(next).toHaveBeenCalledWith(expect.objectContaining({ errorCode: ErrorCode.AUTH_TOKEN_EXPIRED, statusCode: 401 }));
	});

	it("valid token → sets userId/role, next() clean", async () => {
		const token = jwt.sign({ userId: "42", role: "admin" }, SECRET);
		const req: any = { headers: { authorization: `Bearer ${token}` } };
		const next = jest.fn();
		await authMiddleware(req, res(), next);
		expect(next).toHaveBeenCalledWith();
		expect(req.userId).toBe("42");
		expect(req.userRole).toBe("admin");
	});

	it("wrong role → 403 ADMIN_ACCESS_REQUIRED", async () => {
		const token = jwt.sign({ userId: "1", role: "user" }, SECRET);
		const next = jest.fn();
		authGuard("admin")({ headers: { authorization: `Bearer ${token}` } } as any, res(), next);
		await flush();
		expect(next).toHaveBeenCalledWith(expect.objectContaining({ errorCode: ErrorCode.ADMIN_ACCESS_REQUIRED, statusCode: 403 }));
	});

	it("right role → passes; open guard (no roles) passes any authed user", async () => {
		const admin = jwt.sign({ userId: "1", role: "admin" }, SECRET);
		const user = jwt.sign({ userId: "2", role: "user" }, SECRET);
		const n1 = jest.fn();
		authGuard("admin")({ headers: { authorization: `Bearer ${admin}` } } as any, res(), n1);
		await flush();
		expect(n1).toHaveBeenCalledWith();
		const n2 = jest.fn();
		authGuard()({ headers: { authorization: `Bearer ${user}` } } as any, res(), n2);
		await flush();
		expect(n2).toHaveBeenCalledWith();
	});

	it("guard propagates auth failure (missing token → 401, no role check)", async () => {
		const next = jest.fn();
		authGuard("admin")({ headers: {} } as any, res(), next);
		await flush();
		expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
	});
});

describe("error-code mapping", () => {
	let errSpy: jest.SpyInstance;
	beforeEach(() => {
		errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
	});
	afterEach(() => errSpy.mockRestore());

	const req = { method: "GET", url: "/x" } as any;

	it("AppError → status + code passthrough", () => {
		const r = res();
		errorMiddleware(new AppError("BOOK_NOT_FOUND", 404), req, r, jest.fn());
		expect(r.status).toHaveBeenCalledWith(404);
		expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, statusCode: 404 }));
	});

	it("plain Error → 500 INTERNAL", () => {
		const r = res();
		errorMiddleware(new Error("boom"), req, r, jest.fn());
		expect(r.status).toHaveBeenCalledWith(500);
		expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, statusCode: 500 }));
	});

	it("AppError details → errors passthrough", () => {
		const r = res();
		errorMiddleware(new AppError(ErrorCode.VALIDATION_FAILED, 400, { name: ["too short"] }), req, r, jest.fn());
		expect(r.status).toHaveBeenCalledWith(400);
		expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ errors: { name: ["too short"] } }));
	});
});

class NameDto {
	@IsString()
	@MinLength(3)
	name!: string;
}

describe("DTO validator", () => {
	it("valid body → next() clean, body replaced with class instance", async () => {
		const req: any = { body: { name: "abcd" } };
		const next = jest.fn();
		await validateDto(NameDto)(req, res(), next);
		expect(next).toHaveBeenCalledWith();
		expect(req.body).toBeInstanceOf(NameDto);
	});

	it("invalid body → 400 VALIDATION_FAILED with field details", async () => {
		const req: any = { body: { name: "ab" } };
		const next = jest.fn();
		await validateDto(NameDto)(req, res(), next);
		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ errorCode: ErrorCode.VALIDATION_FAILED, statusCode: 400 }),
		);
		const err = next.mock.calls[0][0] as AppError;
		expect(err.details).toHaveProperty("name");
	});

	it("whitelist strips unknown props (no Prisma 500 from crafted fields)", async () => {
		const req: any = { body: { name: "abcd", hacked: "x" } };
		const next = jest.fn();
		await validateDto(NameDto)(req, res(), next);
		expect(next).toHaveBeenCalledWith();
		expect(req.body).not.toHaveProperty("hacked");
	});
});

describe("maintenance middleware allowlist", () => {
	const status = getMaintenanceStatus as jest.Mock;

	it("inactive → next(), nothing blocked", async () => {
		status.mockResolvedValue({ active: false, window: null });
		const r = res();
		const next = jest.fn();
		await maintenanceMiddleware({ path: "/api/orders" } as any, r, next);
		expect(next).toHaveBeenCalledWith();
		expect(r.status).not.toHaveBeenCalled();
	});

	it.each(["/health", "/api/payments/webhooks/payos", "/api/maintenance/status", "/api/auth/login", "/api/admin/users"])(
		"active but allowlisted %s → passes",
		async (path) => {
			status.mockResolvedValue({ active: true, window: {} });
			const r = res();
			const next = jest.fn();
			await maintenanceMiddleware({ path } as any, r, next);
			expect(next).toHaveBeenCalledWith();
			expect(r.status).not.toHaveBeenCalledWith(503);
		},
	);

	it("active + normal API → 503 + Retry-After", async () => {
		status.mockResolvedValue({ active: true, window: {} });
		const r = res();
		const next = jest.fn();
		await maintenanceMiddleware({ path: "/api/orders" } as any, r, next);
		expect(next).not.toHaveBeenCalled();
		expect(r.setHeader).toHaveBeenCalledWith("Retry-After", "300");
		expect(r.status).toHaveBeenCalledWith(503);
		expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
	});

	it("status check throws → fail-open next()", async () => {
		status.mockRejectedValue(new Error("db down"));
		const next = jest.fn();
		await maintenanceMiddleware({ path: "/api/orders" } as any, res(), next);
		expect(next).toHaveBeenCalledWith();
	});
});
