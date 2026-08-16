import { injectable, inject } from "tsyringe";
import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { IBookService } from "./books.service.js";
import { ApiResponse } from "../../middleware/api.response.js";
import { AppError } from "../../middleware/app.error.js";
import { ErrorCode } from "@echotrace/shared";

@injectable()
export class BookController {
  constructor(@inject("IBookService") private readonly bookService: IBookService) {}

  getById = async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id as string);
    const book = await this.bookService.getById(id);
    res.json(ApiResponse.success(book));
  };

  getMyBooks = async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.userId!);
    const books = await this.bookService.getMyBooks(userId);
    res.json(ApiResponse.success(books));
  };

  create = async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.userId!);
    if (isNaN(userId)) throw new AppError(ErrorCode.AUTH_NOT_AUTHENTICATED, 401);
    const { title, content, paperHeight, paperWidth } = req.body;
    if (!content) throw new AppError(ErrorCode.BOOK_MISSING_CONTENT, 400);
    const contentJson = typeof content === "string" ? JSON.parse(content) : content;
    const book = await this.bookService.create(userId, {
      content: contentJson,
      title,
      paperHeight: toNumOrNull(paperHeight),
      paperWidth: toNumOrNull(paperWidth),
    });
    res.status(201).json(ApiResponse.success(book));
  };

  remove = async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id as string);
    const userId = parseInt(req.userId!);
    await this.bookService.delete(id, userId);
    res.json(ApiResponse.message("Book deleted"));
  };

  updatePages = async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id as string);
    const { content, title, paperHeight, paperWidth } = req.body;
    const updateData: any = {};
    if (content) {
      updateData.content = typeof content === "string" ? JSON.parse(content) : content;
    }
    if (title !== undefined) updateData.title = title;
    if (paperHeight !== undefined) updateData.paperHeight = toNumOrNull(paperHeight);
    if (paperWidth !== undefined) updateData.paperWidth = toNumOrNull(paperWidth);
    await this.bookService.updatePages(id, updateData);
    res.json(ApiResponse.success({ id }));
  };
}

function toNumOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}