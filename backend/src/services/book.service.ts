import { prisma } from "../../lib/prisma.js";
import { AppError } from "../middleware/app.error.js";

export class BookService {
  async getById(bookId: number) {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new AppError("Book not found", 404);
    return book;
  }

  async getMyBooks(userId: number) {
    const books = await prisma.book.findMany({
      where: { userId },
      orderBy: { id: "desc" },
    });
    return books.map((b) => {
      let content: any = {};
      try { content = JSON.parse(b.content || "{}"); } catch {}
      const pages = content.pages || [];
      const thumb = pages[0]?.thumbnailUrl || b.coverUrl || null;
      return {
        id: b.id,
        title: b.title,
        pages: content.pageCount || b.pages || 0,
        style: b.style,
        cover: b.cover,
        status: b.status,
        coverUrl: thumb,
        createdAt: b.createdAt?.toISOString() || "",
      };
    });
  }

  async create(userId: number, data: { content: string | null; title?: string }) {
    try {
      const book = await prisma.book.create({
        data: {
          user: { connect: { id: userId } },
          type: "TRAVEL",
          title: data.title || "Untitled",
          style: "PHOTOBOOK",
          font: "Inter",
          cover: "softcover",
          pages: 0,
          status: "DRAFT",
          content: data.content ?? null,
        },
      });
      return book;
    } catch (e: any) {
      console.error("=== FULL BOOK CREATE ERROR ===");
      console.error("message:", e?.message);
      console.error("code:", e?.code);
      console.error("meta:", JSON.stringify(e?.meta));
      if (e?.stack) console.error("stack:", e.stack.split("\n").slice(0, 8).join("\n"));
      throw new Error(`Book create failed: ${e?.code || "UNKNOWN"} — ${(e?.message || "").slice(0, 300)}`);
    }
  }

  async updatePages(bookId: number, data: { content: string; title?: string; pages?: number }) {
    const updateData: any = { content: data.content };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.pages !== undefined) updateData.pages = data.pages;
    await prisma.book.update({
      where: { id: bookId },
      data: updateData,
    });
  }
}
