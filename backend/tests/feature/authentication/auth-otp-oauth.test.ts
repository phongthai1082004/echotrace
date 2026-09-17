/**
 * Part 3 remainder — OTP verify/register + brute-force guard, Google
 * find-or-create, session refresh/logout, password change + notify (A-10),
 * auth/OTP rate-limit windows.
 *
 * NOTE: plan gives no IDs for OTP/OAuth/session/rate-limit cases, so A-11..
 * are new IDs minted here (A-10 is the plan's password-notify ID).
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import express from "express";
import request from "supertest";
import { mock } from "jest-mock-extended";
import { OAuth2Client } from "google-auth-library";
import { OtpService } from "../../../src/modules/authentication/otp/otp.service.js";
import { OAuthService } from "../../../src/modules/authentication/oauth/oauth.service.js";
import { SessionService } from "../../../src/modules/authentication/sessions/sessions.service.js";
import { ProfileService } from "../../../src/modules/user/profile/profile.service.js";
import { AuthRepository } from "../../../src/modules/authentication/repositories/auth.repository.js";
import { UserRepository } from "../../../src/modules/user/repositories/users.repository.js";
import { CacheService } from "../../../src/shared/cache/cache.service.js";
import { NotificationSubject } from "../../../src/modules/notification/notification.subject.js";
import { NotificationChannel } from "@echotrace/shared";
import { authLimiter, otpLimiter } from "../../../src/modules/authentication/shared/rate-limit.js";
import { sendOtpEmail } from "../../../src/modules/notification/channels/mailer.js";

jest.mock("../../../src/modules/notification/channels/mailer.js", () => ({ sendOtpEmail: jest.fn() }));

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-id";

const otpBuild = () => {
	const repo = mock<AuthRepository>();
	const cache = mock<CacheService>();
	return { svc: new OtpService(repo, cache), repo, cache };
};

const otpRecord = (over: any = {}) => ({
	id: 7,
	email: "a@b.c",
	refreshToken: bcrypt.hashSync("123456", 4),
	expiresAt: new Date(Date.now() + 3600e3),
	...over,
});

describe("OtpService.sendOtp (A-11)", () => {
	it("A-11: existing active user -> silent, no token replace, no mail", async () => {
		const { svc, repo } = otpBuild();
		repo.findActiveUserByEmail.mockResolvedValue({ id: 1 } as any);
		await svc.sendOtp("a@b.c");
		expect(repo.replaceOtpToken).not.toHaveBeenCalled();
		expect(sendOtpEmail).not.toHaveBeenCalled();
	});

	it("A-11b: new email -> replaceOtpToken + sendOtpEmail once", async () => {
		const { svc, repo } = otpBuild();
		repo.findActiveUserByEmail.mockResolvedValue(null);
		repo.replaceOtpToken.mockResolvedValue([] as any);
		await svc.sendOtp("n@ew.c");
		expect(repo.replaceOtpToken).toHaveBeenCalledTimes(1);
		expect(sendOtpEmail).toHaveBeenCalledTimes(1);
		expect(sendOtpEmail).toHaveBeenCalledWith("n@ew.c", expect.stringMatching(/^\d{6}$/));
	});
});

describe("OtpService.verifyOtpAndRegister (A-12/A-13)", () => {
	it("A-12: correct OTP -> clears fail counter, revokes, creates user, returns tokens", async () => {
		const { svc, repo, cache } = otpBuild();
		repo.findValidOtp.mockResolvedValue(otpRecord() as any);
		repo.createPasswordUser.mockResolvedValue({ id: 7, email: "a@b.c", role: "user", name: "a" } as any);
		repo.createSessionToken.mockResolvedValue({} as any);
		const res = await svc.verifyOtpAndRegister("a@b.c", "123456", "secret1");
		expect(cache.delete).toHaveBeenCalledWith("otp_fail:7");
		expect(repo.revokeToken).toHaveBeenCalledWith(7);
		expect(repo.createPasswordUser).toHaveBeenCalledWith("a@b.c", expect.any(String));
		expect(res.accessToken).toBeTruthy();
		expect(res.refreshToken).toBeTruthy();
	});

	it("A-13 BVA: 4th wrong attempt -> 400, no revoke; 5th -> revoke + counter cleared", async () => {
		const { svc, repo, cache } = otpBuild();
		repo.findValidOtp.mockResolvedValue(otpRecord() as any);
		cache.increment.mockResolvedValue(4);
		await expect(svc.verifyOtpAndRegister("a@b.c", "000000", "secret1")).rejects.toMatchObject({
			statusCode: 400,
			errorCode: "AUTH_INVALID_OTP",
		});
		expect(repo.revokeToken).not.toHaveBeenCalled();

		cache.increment.mockResolvedValue(5);
		await expect(svc.verifyOtpAndRegister("a@b.c", "000000", "secret1")).rejects.toMatchObject({
			statusCode: 400,
			errorCode: "AUTH_INVALID_OTP",
		});
		expect(repo.revokeToken).toHaveBeenCalledWith(7);
		expect(cache.delete).toHaveBeenCalledWith("otp_fail:7");
	});

	it("A-13b: no OTP requested -> 400; expired -> 400", async () => {
		const { svc, repo } = otpBuild();
		repo.findValidOtp.mockResolvedValue(null);
		await expect(svc.verifyOtpAndRegister("a@b.c", "123456", "secret1")).rejects.toMatchObject({
			statusCode: 400,
			errorCode: "AUTH_OTP_NOT_REQUESTED",
		});
		repo.findValidOtp.mockResolvedValue(otpRecord({ expiresAt: new Date(Date.now() - 1000) }) as any);
		await expect(svc.verifyOtpAndRegister("a@b.c", "123456", "secret1")).rejects.toMatchObject({
			statusCode: 400,
			errorCode: "AUTH_OTP_EXPIRED",
		});
	});
});

describe("OAuthService.loginWithGoogle (A-14)", () => {
	const ticket = (payload: any) => ({ getPayload: () => payload });
	let verify: jest.SpyInstance;

	beforeEach(() => {
		verify = jest.spyOn(OAuth2Client.prototype, "verifyIdToken");
	});
	afterEach(() => verify.mockRestore());

	const build = () => {
		const repo = mock<AuthRepository>();
		return { svc: new OAuthService(repo), repo };
	};

	it("A-14: unknown email -> find-or-create, returns tokens", async () => {
		const { svc, repo } = build();
		verify.mockResolvedValue(ticket({ email: "g@x.y", sub: "gid", name: "G", picture: "p" }) as any);
		repo.findUserByGoogleOrEmail.mockResolvedValue(null);
		repo.createGoogleUser.mockResolvedValue({ id: 3, email: "g@x.y", role: "user", name: "G" } as any);
		repo.createSessionToken.mockResolvedValue({} as any);
		const res = await svc.loginWithGoogle("tok");
		expect(repo.createGoogleUser).toHaveBeenCalledWith(
			expect.objectContaining({ email: "g@x.y", googleId: "gid" }),
		);
		expect(res.accessToken).toBeTruthy();
	});

	it("A-14b: existing user -> no create; banned -> 403; no email -> 401", async () => {
		const { svc, repo } = build();
		verify.mockResolvedValue(ticket({ email: "g@x.y", sub: "gid" }) as any);
		repo.findUserByGoogleOrEmail.mockResolvedValue({ id: 3, role: "user", isDelete: false } as any);
		repo.createSessionToken.mockResolvedValue({} as any);
		await svc.loginWithGoogle("tok");
		expect(repo.createGoogleUser).not.toHaveBeenCalled();

		repo.findUserByGoogleOrEmail.mockResolvedValue({ id: 3, role: "user", isDelete: true } as any);
		await expect(svc.loginWithGoogle("tok")).rejects.toMatchObject({ statusCode: 403 });

		verify.mockResolvedValue(ticket({ sub: "gid" }) as any);
		await expect(svc.loginWithGoogle("tok")).rejects.toMatchObject({ statusCode: 401 });
	});
});

describe("SessionService logout/refresh (A-15)", () => {
	it("A-15: logout revokes session tokens; revoked refresh -> 401, no rotation", async () => {
		const repo = mock<AuthRepository>();
		const svc = new SessionService(repo);
		await svc.logout("5");
		expect(repo.revokeSessionTokens).toHaveBeenCalledWith(5);

		const tok = jwt.sign({ userId: "5" }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "30d" });
		repo.findSessionByToken.mockResolvedValue(null);
		await expect(svc.refresh(tok)).rejects.toMatchObject({
			statusCode: 401,
			errorCode: "AUTH_REFRESH_TOKEN_REVOKED",
		});
		expect(repo.rotateSessionToken).not.toHaveBeenCalled();
	});
});

describe("password change + notify (A-10)", () => {
	it("A-10: success -> DB update + DB/PUSH/EMAIL notify", async () => {
		const repo = mock<UserRepository>();
		const subject = mock<NotificationSubject>();
		subject.notify.mockResolvedValue(undefined);
		const svc = new ProfileService(repo, subject);
		repo.findByIdForPassword.mockResolvedValue({
			id: 5,
			email: "a@b.c",
			password: bcrypt.hashSync("oldpw1", 4),
		} as any);
		repo.updateUser.mockResolvedValue({} as any);
		await expect(
			svc.changePassword("5", { currentPassword: "oldpw1", newPassword: "newpw12" } as any),
		).resolves.toEqual({ message: "Password updated successfully" });
		expect(subject.notify).toHaveBeenCalledTimes(1);
		expect(subject.notify).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "5",
				channels: [NotificationChannel.DB, NotificationChannel.PUSH, NotificationChannel.EMAIL],
			}),
		);
	});
});

describe("rate-limit windows (A-16 BVA)", () => {
	const appFor = (limiter: any) => {
		const app = express();
		app.use("/t", limiter, (_req, res) => res.json({ ok: true }));
		return app;
	};

	it("A-16: otpLimiter allows 5, blocks the 6th with 429", async () => {
		const app = appFor(otpLimiter);
		for (let i = 0; i < 5; i++) await request(app).post("/t").expect(200);
		await request(app).post("/t").expect(429);
	}, 30000);

	it("A-16b: authLimiter allows 10, blocks the 11th with 429", async () => {
		const app = appFor(authLimiter);
		for (let i = 0; i < 10; i++) await request(app).post("/t").expect(200);
		await request(app).post("/t").expect(429);
	}, 30000);
});
