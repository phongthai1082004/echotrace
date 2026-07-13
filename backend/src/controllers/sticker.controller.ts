import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { prisma } from "../../lib/prisma.js";

export class StickerController {
  async list(req: AuthRequest, res: Response) {
    const stickers = await prisma.decorAsset.findMany({
      where: { type: "sticker" },
      orderBy: { id: "desc" },
    });
    res.json(ApiResponse.success(stickers));
  }

  async create(req: AuthRequest, res: Response) {
    const { url, publicId, name, category } = req.body;
    if (!url) throw new AppError("url is required", 400);
    const sticker = await prisma.decorAsset.create({
      data: { url, publicId: publicId || "", type: "sticker", name: name || "", category: category || null },
    });
    res.status(201).json(ApiResponse.success(sticker));
  }

  async remove(req: AuthRequest, res: Response) {
    const id = parseInt(String(req.params.id));
    const sticker = await prisma.decorAsset.findUnique({ where: { id } });
    if (!sticker) throw new AppError("Sticker not found", 404);
    await prisma.decorAsset.delete({ where: { id } });
    res.json(ApiResponse.message("Sticker deleted"));
  }
}
