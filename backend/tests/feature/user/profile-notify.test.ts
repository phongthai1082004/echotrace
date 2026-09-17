/**
 * Profile password-change notify: success -> DB+PUSH+MAIL; failure -> silent;
 * null subject -> no throw. (A-10 family; plan names only A-10.)
 */
import bcrypt from "bcryptjs";
import { mock } from "jest-mock-extended";
import { ProfileService } from "../../../src/modules/user/profile/profile.service.js";
import { UserRepository } from "../../../src/modules/user/repositories/users.repository.js";
import { NotificationSubject } from "../../../src/modules/notification/notification.subject.js";
import { NotificationChannel } from "@echotrace/shared";

const userRow = (over: any = {}) => ({
	id: 5,
	email: "a@b.c",
	password: bcrypt.hashSync("oldpw1", 4),
	...over,
});

const build = (withSubject = true) => {
	const repo = mock<UserRepository>();
	const subject = mock<NotificationSubject>();
	subject.notify.mockResolvedValue(undefined);
	const svc = withSubject ? new ProfileService(repo, subject) : new ProfileService(repo);
	return { svc, repo, subject };
};

describe("profile changePassword notify (A-10)", () => {
	it("A-10: success -> password updated + DB+PUSH+EMAIL notify", async () => {
		const { svc, repo, subject } = build();
		repo.findByIdForPassword.mockResolvedValue(userRow() as any);
		repo.updateUser.mockResolvedValue({} as any);
		await expect(
			svc.changePassword("5", { currentPassword: "oldpw1", newPassword: "newpw12" } as any),
		).resolves.toEqual({ message: "Password updated successfully" });
		expect(repo.updateUser).toHaveBeenCalledWith(5, expect.objectContaining({ password: expect.any(String) }));
		expect(subject.notify).toHaveBeenCalledTimes(1);
		const payload = subject.notify.mock.calls[0][0];
		expect(payload.userId).toBe("5");
		expect(payload.channels).toEqual([NotificationChannel.DB, NotificationChannel.PUSH, NotificationChannel.EMAIL]);
		expect(payload.email).toBe("a@b.c");
	});

	it("A-10b: wrong current password -> 400, no DB write, no notify", async () => {
		const { svc, repo, subject } = build();
		repo.findByIdForPassword.mockResolvedValue(userRow() as any);
		await expect(
			svc.changePassword("5", { currentPassword: "nope123", newPassword: "newpw12" } as any),
		).rejects.toMatchObject({ statusCode: 400 });
		expect(repo.updateUser).not.toHaveBeenCalled();
		expect(subject.notify).not.toHaveBeenCalled();
	});

	it("A-10c: unknown user -> 404, no notify", async () => {
		const { svc, repo, subject } = build();
		repo.findByIdForPassword.mockResolvedValue(null);
		await expect(
			svc.changePassword("5", { currentPassword: "oldpw1", newPassword: "newpw12" } as any),
		).rejects.toMatchObject({ statusCode: 404 });
		expect(subject.notify).not.toHaveBeenCalled();
	});

	it("A-10d: null subject -> password still changes, no throw", async () => {
		const { svc, repo } = build(false);
		repo.findByIdForPassword.mockResolvedValue(userRow({ password: null }) as any);
		repo.updateUser.mockResolvedValue({} as any);
		await expect(
			svc.changePassword("5", { newPassword: "newpw12" } as any),
		).resolves.toEqual({ message: "Password updated successfully" });
		expect(repo.updateUser).toHaveBeenCalledTimes(1);
	});
});
