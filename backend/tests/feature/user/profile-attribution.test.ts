/**
 * Profile attribution stamp: write-once (first touch wins).
 */
import { mock } from "jest-mock-extended";
import { ProfileService } from "../../../src/modules/user/profile/profile.service.js";
import { UserRepository } from "../../../src/modules/user/repositories/users.repository.js";

const build = () => {
	const repo = mock<UserRepository>();
	const svc = new ProfileService(repo);
	return { svc, repo };
};

describe("stampAttribution", () => {
	it("writes only when source present, guarded by firstUtmSource null", async () => {
		const { svc, repo } = build();
		repo.updateById.mockResolvedValue({ count: 1 });
		await expect(
			svc.stampAttribution("5", { source: "Facebook", medium: "cpc", campaign: "tet" }),
		).resolves.toEqual({ stamped: true });
		expect(repo.updateById).toHaveBeenCalledWith(
			5,
			{ firstUtmSource: "facebook", firstUtmMedium: "cpc", firstUtmCampaign: "tet" },
			{ firstUtmSource: null },
		);
	});

	it("blank source → no write", async () => {
		const { svc, repo } = build();
		await expect(svc.stampAttribution("5", { source: "  " })).resolves.toEqual({ stamped: false });
		expect(repo.updateById).not.toHaveBeenCalled();
	});

	it("already stamped (count 0) → stamped false", async () => {
		const { svc, repo } = build();
		repo.updateById.mockResolvedValue({ count: 0 });
		await expect(svc.stampAttribution("5", { source: "tiktok" })).resolves.toEqual({ stamped: false });
	});
});
