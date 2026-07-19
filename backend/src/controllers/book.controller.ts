import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { BookService } from "../services/book.service.js";
import { ApiResponse } from "../middleware/api.response.js";

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
    if (isNaN(userId)) { res.status(401).json({ success: false, message: "Invalid user ID from token" }); return; }
    const { title, content } = req.body;
    if (!content) { res.status(400).json({ success: false, message: "Missing content" }); return; }
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    try {
      const book = await bookService.create(userId, { content: contentStr, title });
      res.status(201).json(ApiResponse.success(book));
    } catch (err: any) {
      console.error("[book.create] error:", err?.message || err);
      res.status(500).json({ success: false, message: err?.message || "Internal error" });
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
      console.error("[book.updatePages] error:", err?.message || err);
      res.status(500).json({ success: false, message: err?.message || "Internal error" });
    }
  }
}
