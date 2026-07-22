import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { BookService } from "../services/book.service.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { ErrorCode } from "../errors/error-codes.js";

const bookService = new BookService();

export class BookController {
  async getById(req: AuthRequest, res: Response) {
    const id = parseInt(req.params.id as string);
    const book = await bookService.getById(id);
    res.json(ApiResponse.success(book));
  }

  async getMyBooks(req: AuthRequest, res: Response) {
    const userId = parseInt(req.userId!);
    const books = await bookService.getMyBooks(userId);
    res.json(ApiResponse.success(books));
  }

  async create(req: AuthRequest, res: Response) {
    const userId = parseInt(req.userId!);
    if (isNaN(userId)) throw new AppError(ErrorCode.AUTH_NOT_AUTHENTICATED, 401);
    const { title, content } = req.body;
    if (!content) throw new AppError(ErrorCode.BOOK_MISSING_CONTENT, 400);
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    try {
      const book = await bookService.create(userId, { content: contentStr, title });
      res.status(201).json(ApiResponse.success(book));
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      console.error("[book.create] error:", err?.message || err);
      throw new AppError(ErrorCode.BOOK_CREATE_FAILED, 500);
    }
  }

  async remove(req: AuthRequest, res: Response) {
    const id = parseInt(req.params.id as string);
    const userId = parseInt(req.userId!);
    await bookService.delete(id, userId);
    res.json(ApiResponse.message("Book deleted"));
  }

  async updatePages(req: AuthRequest, res: Response) {
    const id = parseInt(req.params.id as string);
    const { content, title } = req.body;
    const updateData: any = {};
    if (content) {
      updateData.content = typeof content === "string" ? content : JSON.stringify(content);
      try {
        const parsedPages = JSON.parse(updateData.content)?.pages;
        if (Array.isArray(parsedPages)) updateData.pages = parsedPages.length;
      } catch {}
    }
    if (title !== undefined) updateData.title = title;
    try {
      await bookService.updatePages(id, updateData);
      res.json(ApiResponse.success({ id }));
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      console.error("[book.updatePages] error:", err?.message || err);
      throw new AppError(ErrorCode.BOOK_CREATE_FAILED, 500);
    }
  }
}
