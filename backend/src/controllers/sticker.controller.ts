import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { BaseService } from "../utils/base.service.js";
import { prisma } from "../../lib/prisma.js";
import { AssetCategory } from "../../enum/decor.asset.enum.js";
import { CloudinaryService } from "../services/cloudinary.service.js";
import type { DecorAssetModel } from "../../generated/prisma/models/DecorAsset.js";

const VALID_CATEGORIES = new Set(Object.values(AssetCategory));
const cloudinary = new CloudinaryService();
const base = new BaseService<DecorAssetModel>(prisma.decorAsset);

export class StickerController {
  async list(req: AuthRequest, res: Response) {
    const { category, type } = req.query;
    const extraWhere: any = {};
    if (type === "sticker" || type === "background") extraWhere.type = type;
    if (typeof category === "string" && VALID_CATEGORIES.has(category as AssetCategory)) {
      extraWhere.category = category;
    }
    const stickers = await base.delegate.findMany({
      where: { ...extraWhere, isDelete: false },
      orderBy: { id: "desc" },
    });
    res.json(ApiResponse.success(stickers));
  }

  async create(req: AuthRequest, res: Response) {
    const { url, publicId, name, category, type } = req.body;
    if (!url) throw new AppError("url is required", 400);
    if (category && !VALID_CATEGORIES.has(category)) {
      throw new AppError(`Invalid category. Valid: ${Object.values(AssetCategory).join(", ")}`, 400);
    }
    const assetType = type === "background" ? "background" : "sticker";
    const sticker = await base.create({
      url, publicId: publicId || "", type: assetType, name: name || "", category: category || null,
    });
    res.status(201).json(ApiResponse.success(sticker));
  }

  async remove(req: AuthRequest, res: Response) {
    const id = parseInt(String(req.params.id));
    const sticker = await base.findById(id);
    await base.hardDelete(id);
    if (sticker.publicId) {
      cloudinary.deleteAsset(sticker.publicId).catch(() => {});
    }
    res.json(ApiResponse.message("Sticker deleted"));
  }
}
