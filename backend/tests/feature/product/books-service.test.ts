/**
 * Part 2 — BookService + BookController (B-1..B-4).
 * Base = current code behavior; collaborators mocked, real `shared` mappers.
 */
import { mock } from "jest-mock-extended";
import { BookService } from "../../../src/modules/product/books/books.service.js";
import { BookController } from "../../../src/modules/product/books/books.controller.js";
import { BookRepository } from "../../../src/modules/product/books/books.repository.js";
import type { IBookService } from "../../../src/modules/product/books/books.service.js";

const row = (over: any = {}) => ({
  id: 1,
  userId: 1,
  title: "T",
  style: "PHOTOBOOK",
  font: "Inter",
  cover: "softcover",
  coverUrl: null,
  paperHeight: null,
  paperWidth: null,
  content: { pages: [{ index: 0 }] },
  createdAt: "2026-01-01",
  ...over,
});

const build = () => {
  const repo = mock<BookRepository>();
  return { svc: new BookService(repo), repo };
};

const res = () => {
  const r: any = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

describe("BookService.create UTM pinning (B-1, B-2)", () => {
  it("B-1: create with attribution pins 3 columns (trimmed/cased)", async () => {
    const { svc, repo } = build();
    (repo.createBook as jest.Mock).mockResolvedValue(row());
    await svc.create(1, { content: {}, title: "T" } as any, {
      source: " Google ",
      medium: " CPC ",
      campaign: " Summer Sale ",
    });
    const arg = (repo.createBook as jest.Mock).mock.calls[0][0];
    expect(arg.utmSource).toBe("google");
    expect(arg.utmMedium).toBe("cpc");
    expect(arg.utmCampaign).toBe("Summer Sale");
  });

  it("B-1b: empty source nulls all three even when medium/campaign given", async () => {
    const { svc, repo } = build();
    (repo.createBook as jest.Mock).mockResolvedValue(row());
    await svc.create(1, { content: {} } as any, { source: "  ", medium: "cpc", campaign: "x" });
    const arg = (repo.createBook as jest.Mock).mock.calls[0][0];
    expect(arg.utmSource).toBeNull();
    expect(arg.utmMedium).toBeNull();
    expect(arg.utmCampaign).toBeNull();
  });

  it("B-1c: created DTO hides content (null) but keeps title", async () => {
    const { svc, repo } = build();
    (repo.createBook as jest.Mock).mockResolvedValue(row({ title: "Hi" }));
    const dto = await svc.create(1, { content: {}, title: "Hi" } as any, { source: "g" });
    expect(dto.content).toBeNull();
    expect(dto.title).toBe("Hi");
  });

  it("B-2: create without attribution -> all UTM null", async () => {
    const { svc, repo } = build();
    (repo.createBook as jest.Mock).mockResolvedValue(row());
    await svc.create(1, { content: {} } as any);
    const arg = (repo.createBook as jest.Mock).mock.calls[0][0];
    expect(arg.utmSource).toBeNull();
    expect(arg.utmMedium).toBeNull();
    expect(arg.utmCampaign).toBeNull();
  });
});

describe("BookService owner/rights (B-3)", () => {
  it("B-3: getById another user's book -> 403 BOOK_FORBIDDEN, missing -> 404", async () => {
    const { svc, repo } = build();
    (repo.findBookById as jest.Mock).mockResolvedValue(row({ userId: 2 }));
    await expect(svc.getById(1, 1)).rejects.toMatchObject({ statusCode: 403, errorCode: "BOOK_FORBIDDEN" });
    (repo.findBookById as jest.Mock).mockResolvedValue(null);
    await expect(svc.getById(1, 1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("B-3b: updatePages another user's book -> 403, no update call", async () => {
    const { svc, repo } = build();
    (repo.findBookById as jest.Mock).mockResolvedValue(row({ userId: 2 }));
    await expect(svc.updatePages(1, 1, { title: "x" } as any)).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.updateBook).not.toHaveBeenCalled();
  });

  it("B-3c: delete another user's book -> 403, missing -> 404", async () => {
    const { svc, repo } = build();
    (repo.findBookById as jest.Mock).mockResolvedValue(row({ userId: 2 }));
    await expect(svc.delete(1, 1)).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.deleteBook).not.toHaveBeenCalled();
    (repo.findBookById as jest.Mock).mockResolvedValue(null);
    await expect(svc.delete(1, 1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("B-3d: updatePages merges changedPages via resolveContent + forwards fields", async () => {
    const { svc, repo } = build();
    (repo.findBookById as jest.Mock).mockResolvedValue(
      row({ content: { pages: [{ index: 0, canvasJson: "a" }, { index: 1, canvasJson: "b" }] } }),
    );
    (repo.updateBook as jest.Mock).mockResolvedValue({});
    await svc.updatePages(1, 1, { content: { changedPages: [{ index: 1, canvasJson: "B!" }] }, title: "N" } as any);
    const update = (repo.updateBook as jest.Mock).mock.calls[0][1];
    expect(update.title).toBe("N");
    expect(update.content.pages[1].canvasJson).toBe("B!");
    expect(update.content.pages[0].canvasJson).toBe("a");
    expect(update.content).not.toHaveProperty("changedPages");
  });
});

describe("BookController.create (B-4)", () => {
  const buildCtrl = () => {
    const service = mock<IBookService>();
    return { ctrl: new BookController(service), service };
  };

  it("B-4: missing content -> 400 BOOK_MISSING_CONTENT, service not called", async () => {
    const { ctrl, service } = buildCtrl();
    const r = res();
    await expect(ctrl.create({ body: { title: "t" }, userId: "1" } as any, r)).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "BOOK_MISSING_CONTENT",
    });
    expect(service.create).not.toHaveBeenCalled();
  });

  it("B-4b: string content self-parses before service call (201)", async () => {
    const { ctrl, service } = buildCtrl();
    (service.create as jest.Mock).mockResolvedValue({ id: 1 });
    const r = res();
    await ctrl.create(
      { body: { title: "t", content: JSON.stringify({ pages: [] }), paperHeight: 100 }, userId: "1" } as any,
      r,
    );
    expect(service.create).toHaveBeenCalledWith(1, { content: { pages: [] }, title: "t", paperHeight: 100, paperWidth: undefined }, undefined);
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it("B-4c: object content passes through as-is with attribution", async () => {
    const { ctrl, service } = buildCtrl();
    (service.create as jest.Mock).mockResolvedValue({ id: 2 });
    const r = res();
    const content = { pages: [{ index: 0 }] };
    await ctrl.create({ body: { content, attribution: { source: "g" } }, userId: "7" } as any, r);
    expect(service.create).toHaveBeenCalledWith(7, expect.objectContaining({ content }), { source: "g" });
  });
});
