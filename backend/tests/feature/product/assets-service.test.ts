/**
 * Part 2 — assets: stickers / print-options / uploads (CRUD + category
 * validation + R2 mock; R2 failure never blocks the DB write).
 * Base = current code behavior; repos/R2 mocked, real `shared` mappers.
 */
import { mock } from "jest-mock-extended";
import { StickerController } from "../../../src/modules/product/stickers/stickers.controller.js";
import { DecorAssetRepository } from "../../../src/modules/product/stickers/stickers.repository.js";
import { PrintOptionService } from "../../../src/modules/product/print-options/print-options.service.js";
import { PrintOptionRepository } from "../../../src/modules/product/print-options/print-options.repository.js";
import { OptionCatalogCacheService } from "../../../src/modules/product/catalog/option-catalog.cache.service.js";
import { UploadController } from "../../../src/modules/product/uploads/uploads.controller.js";
import { UserImageService } from "../../../src/modules/product/uploads/user-images.service.js";
import { UserImagesRepository } from "../../../src/modules/product/uploads/user-images.repository.js";
import type { IR2ImageService } from "../../../src/shared/r2/r2.service.js";
import type { IUserImageService } from "../../../src/modules/product/uploads/user-images.service.js";

const res = () => {
  const r: any = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

// isR2PublicUrl so hostname với R2_WORKER_URL nên test ép host giả (hermetic,
// khỏi phụ thuộc .env thật nếu chuỗi import có load dotenv).
process.env.R2_WORKER_URL = "https://r2.test.workers.dev";
const R2U = "https://r2.test.workers.dev/echotrace/gallery/user_1/a.jpg";

const optRow = (over: any = {}) => ({
  id: 1,
  type: "cover",
  code: "soft",
  name: { vi: "a", en: "b", es: "c" },
  description: { vi: "", en: "", es: "" },
  width: null,
  height: null,
  price: 1000,
  isDelete: false,
  ...over,
});

describe("StickerController", () => {
  const build = () => {
    const repo = mock<DecorAssetRepository>();
    const r2 = mock<IR2ImageService>();
    (r2.deleteAsset as jest.Mock).mockResolvedValue({});
    return { ctrl: new StickerController(r2, repo), repo, r2 };
  };

  it("list without category -> type sticker + isDelete false only", async () => {
    const { ctrl, repo } = build();
    (repo.list as jest.Mock).mockResolvedValue([]);
    const r = res();
    await ctrl.list({ query: {} } as any, r);
    expect(repo.list).toHaveBeenCalledWith({ type: "sticker", isDelete: false });
    expect(r.json).toHaveBeenCalled();
  });

  it("list with valid category filters; invalid category ignored (not 400)", async () => {
    const { ctrl, repo } = build();
    (repo.list as jest.Mock).mockResolvedValue([]);
    await ctrl.list({ query: { category: "travel" } } as any, res());
    expect(repo.list).toHaveBeenCalledWith({ type: "sticker", category: "travel", isDelete: false });
    await ctrl.list({ query: { category: "junk" } } as any, res());
    expect(repo.list).toHaveBeenLastCalledWith({ type: "sticker", isDelete: false });
  });

  it("create without url -> 400 UPLOAD_URL_REQUIRED", async () => {
    const { ctrl, repo } = build();
    await expect(ctrl.create({ body: {}, userId: "1" } as any, res())).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "UPLOAD_URL_REQUIRED",
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("create with invalid category -> 400 UPLOAD_CATEGORY_INVALID", async () => {
    const { ctrl, repo } = build();
    await expect(
      ctrl.create({ body: { url: R2U, category: "junk" }, userId: "1" } as any, res()),
    ).rejects.toMatchObject({ statusCode: 400, errorCode: "UPLOAD_CATEGORY_INVALID" });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("create with non-R2 url -> 400 VALIDATION_FAILED", async () => {
    const { ctrl, repo } = build();
    await expect(ctrl.create({ body: { url: "https://evil.example/x.png" }, userId: "1" } as any, res())).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "VALIDATION_FAILED",
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("create ok -> 201 with defaults (publicId '', name '', category null)", async () => {
    const { ctrl, repo } = build();
    (repo.create as jest.Mock).mockResolvedValue({ id: 1 });
    const r = res();
    await ctrl.create({ body: { url: R2U }, userId: "3" } as any, r);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: R2U, publicId: "", type: "sticker", name: "", category: null, createdBy: 3 }),
    );
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it("remove missing -> 404; ok -> DB remove + R2 delete", async () => {
    const { ctrl, repo, r2 } = build();
    (repo.findById as jest.Mock).mockResolvedValue(null);
    await expect(ctrl.remove({ params: { id: "9" } } as any, res())).rejects.toMatchObject({ statusCode: 404 });

    (repo.findById as jest.Mock).mockResolvedValue({ id: 9, publicId: "p1" });
    const r = res();
    await ctrl.remove({ params: { id: "9" } } as any, r);
    expect(repo.remove).toHaveBeenCalledWith(9);
    expect(r2.deleteAsset).toHaveBeenCalledWith("p1");
    expect(r.json).toHaveBeenCalled();
  });

  it("remove: R2 failure does not block DB save (error swallowed, still 200)", async () => {
    const { ctrl, repo, r2 } = build();
    (repo.findById as jest.Mock).mockResolvedValue({ id: 5, publicId: "p5" });
    (r2.deleteAsset as jest.Mock).mockRejectedValue(new Error("r2 down"));
    const r = res();
    await ctrl.remove({ params: { id: "5" } } as any, r);
    expect(repo.remove).toHaveBeenCalledWith(5);
    expect(r.json).toHaveBeenCalled();
  });

  it("remove without publicId skips R2 call", async () => {
    const { ctrl, repo, r2 } = build();
    (repo.findById as jest.Mock).mockResolvedValue({ id: 6, publicId: null });
    await ctrl.remove({ params: { id: "6" } } as any, res());
    expect(r2.deleteAsset).not.toHaveBeenCalled();
  });
});

describe("PrintOptionService", () => {
  const build = () => {
    const cache = mock<OptionCatalogCacheService>();
    const repo = mock<PrintOptionRepository>();
    return { svc: new PrintOptionService(cache, repo), cache, repo };
  };
  const dto = (over: any = {}) => ({
    type: "cover",
    code: "soft",
    name: { vi: "a", en: "b", es: "c" },
    width: null,
    height: null,
    price: 1000,
    ...over,
  });

  it("create ok -> repo + cache invalidate; P2002 -> 409 PRINT_OPTION_CODE_EXISTS", async () => {
    const { svc, repo, cache } = build();
    (repo.createPrintOption as jest.Mock).mockResolvedValue(optRow());
    const out = await svc.create(dto() as any);
    expect(out.code).toBe("soft");
    expect(cache.invalidateOption).toHaveBeenCalledWith("cover", "soft");

    (repo.createPrintOption as jest.Mock).mockRejectedValue({ code: "P2002" });
    await expect(svc.create(dto() as any)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "PRINT_OPTION_CODE_EXISTS",
    });
  });

  it("update missing/deleted -> 404; ok invalidates old + new keys", async () => {
    const { svc, repo, cache } = build();
    (repo.findById as jest.Mock).mockResolvedValue(null);
    await expect(svc.update(1, {} as any)).rejects.toMatchObject({ statusCode: 404 });
    (repo.findById as jest.Mock).mockResolvedValue(optRow({ isDelete: true }));
    await expect(svc.update(1, {} as any)).rejects.toMatchObject({ statusCode: 404 });

    (repo.findById as jest.Mock).mockResolvedValue(optRow());
    (repo.updatePrintOption as jest.Mock).mockResolvedValue(optRow({ type: "paper", code: "matt" }));
    await svc.update(1, { price: 2000 } as any);
    expect(cache.invalidateOption).toHaveBeenCalledWith("cover", "soft");
    expect(cache.invalidateOption).toHaveBeenCalledWith("paper", "matt");
  });

  it("update P2002 -> 409", async () => {
    const { svc, repo } = build();
    (repo.findById as jest.Mock).mockResolvedValue(optRow());
    (repo.updatePrintOption as jest.Mock).mockRejectedValue({ code: "P2002" });
    await expect(svc.update(1, { code: "dup" } as any)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("remove missing -> 404; ok -> softDelete + invalidate", async () => {
    const { svc, repo, cache } = build();
    (repo.findById as jest.Mock).mockResolvedValue(null);
    await expect(svc.remove(1)).rejects.toMatchObject({ statusCode: 404 });
    (repo.findById as jest.Mock).mockResolvedValue(optRow());
    await svc.remove(1);
    expect(repo.softDeletePrintOption).toHaveBeenCalledWith(1);
    expect(cache.invalidateOption).toHaveBeenCalledWith("cover", "soft");
  });
});

describe("UploadController + UserImageService", () => {
  const imgRow = (over: any = {}) => ({
    id: 1,
    userId: 1,
    url: "u",
    publicId: null,
    width: 10,
    height: 10,
    size: null,
    ...over,
  });

  it("getSignature maps type -> folder (sticker/gallery/book-thumb)", async () => {
    const r2 = mock<IR2ImageService>();
    const images = mock<IUserImageService>();
    const ctrl = new UploadController(r2, images);
    (r2.issueUpload as jest.Mock).mockResolvedValue({ token: "t", folder: "f", expiry: 1, uploadUrl: "http://x" });
    const r = res();
    await ctrl.getSignature({ query: { type: "sticker" }, userId: "4", userRole: "admin" } as any, r);
    expect(r2.issueUpload).toHaveBeenCalledWith("echotrace/stickers");
    await expect(ctrl.getSignature({ query: { type: "sticker" }, userId: "4", userRole: "user" } as any, res())).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "ADMIN_ACCESS_REQUIRED",
    });
    await ctrl.getSignature({ query: {}, userId: "4" } as any, res());
    expect(r2.issueUpload).toHaveBeenCalledWith("echotrace/gallery/user_4");
    await ctrl.getSignature({ query: { type: "book-thumb" }, userId: "4" } as any, res());
    expect(r2.issueUpload).toHaveBeenCalledWith("echotrace/books/user_4");
    expect(r.json).toHaveBeenCalled();
  });

  it("saveImage without url -> 400; ok -> 201 via service (DB save unconditional)", async () => {
    const r2 = mock<IR2ImageService>();
    const images = mock<IUserImageService>();
    const ctrl = new UploadController(r2, images);
    await expect(ctrl.saveImage({ body: {}, userId: "1" } as any, res())).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "UPLOAD_URL_REQUIRED",
    });
    (images.create as jest.Mock).mockResolvedValue({ id: 1 });
    const r = res();
    await ctrl.saveImage({ body: { url: R2U, width: 10, height: 10 }, userId: "1" } as any, r);
    expect(images.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, url: R2U }));
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it("saveImage with non-R2 url -> 400 VALIDATION_FAILED", async () => {
    const r2 = mock<IR2ImageService>();
    const images = mock<IUserImageService>();
    const ctrl = new UploadController(r2, images);
    await expect(
      ctrl.saveImage({ body: { url: "https://evil.example/x.png" }, userId: "1" } as any, res()),
    ).rejects.toMatchObject({ statusCode: 400, errorCode: "VALIDATION_FAILED" });
    expect(images.create).not.toHaveBeenCalled();
  });

  it("UserImageService.getById missing -> 404 IMAGE_NOT_FOUND; create/list passthrough", async () => {
    const repo = mock<UserImagesRepository>();
    const svc = new UserImageService(repo);
    (repo.findByIdForUser as jest.Mock).mockResolvedValue(null);
    await expect(svc.getById(1, 1)).rejects.toMatchObject({ statusCode: 404, errorCode: "IMAGE_NOT_FOUND" });

    (repo.findByIdForUser as jest.Mock).mockResolvedValue(imgRow());
    expect((await svc.getById(1, 1)).url).toBe("u");
    (repo.createUserImage as jest.Mock).mockResolvedValue(imgRow({ id: 2 }));
    expect((await svc.create({ userId: 1, url: "u", width: 1, height: 1 } as any)).id).toBe(2);
    (repo.listByUser as jest.Mock).mockResolvedValue([imgRow()]);
    expect(await svc.listByUser(1)).toHaveLength(1);
  });

  it("UserImageService.delete without publicId -> soft-delete, no R2 touch", async () => {
    const repo = mock<UserImagesRepository>();
    const svc = new UserImageService(repo);
    (repo.findByIdForUser as jest.Mock).mockResolvedValue(imgRow({ publicId: null }));
    (repo.deleteUserImage as jest.Mock).mockResolvedValue({ count: 1 });
    await svc.delete(1, 1);
    expect(repo.deleteUserImage).toHaveBeenCalledWith(1, 1);
  });
});
