/**
 * Shared admin image pool: admins see each other's uploads, never customers'.
 */
import { mock } from 'jest-mock-extended';
import { UserImageService } from '../../src/modules/product/uploads/user-images.service.js';
import { UserImagesRepository } from '../../src/modules/product/uploads/user-images.repository.js';

const build = () => {
	const repo = mock<UserImagesRepository>();
	return { svc: new UserImageService(repo), repo };
};

const row = (over: any = {}) => ({
	id: 1,
	userId: 9,
	url: 'http://x/a.png',
	publicId: '',
	width: null,
	height: null,
	size: null,
	thumbUrl: null,
	bookId: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	isDelete: false,
	deletedAt: null,
	...over,
});

describe('UserImageService.listByAdmins', () => {
	it('returns mapped DTOs from admin-scoped repo query', async () => {
		const { svc, repo } = build();
		(repo.listByAdmins as jest.Mock).mockResolvedValue([row(), row({ id: 2 })]);
		const out = await svc.listByAdmins();
		expect(repo.listByAdmins).toHaveBeenCalledTimes(1);
		expect(out.map((i: any) => i.id)).toEqual([1, 2]);
	});
});

describe('UserImageService.deleteByAdmin', () => {
	it('404 when image missing', async () => {
		const { svc, repo } = build();
		(repo.findByIdWithOwner as jest.Mock).mockResolvedValue(null);
		await expect(svc.deleteByAdmin(99)).rejects.toMatchObject({ statusCode: 404 });
		expect(repo.softDeleteById).not.toHaveBeenCalled();
	});

	it("404 when owner is a customer (private photos stay private)", async () => {
		const { svc, repo } = build();
		(repo.findByIdWithOwner as jest.Mock).mockResolvedValue({ ...row(), user: { role: 'user' } });
		await expect(svc.deleteByAdmin(1)).rejects.toMatchObject({ statusCode: 404 });
		expect(repo.softDeleteById).not.toHaveBeenCalled();
	});

	it("soft-deletes another admin's image (no R2 call without publicId)", async () => {
		const { svc, repo } = build();
		(repo.findByIdWithOwner as jest.Mock).mockResolvedValue({ ...row(), user: { role: 'admin' } });
		await svc.deleteByAdmin(1);
		expect(repo.softDeleteById).toHaveBeenCalledWith(1);
	});
});
