import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { CloudinaryService } from "../services/cloudinary.service.js";
import { UserImageService } from "../services/user-image.service.js";

const cloudinary = new CloudinaryService();
const userImageService = new UserImageService();

export class UploadController {
  async getSignature(req: AuthRequest, res: Response) {
    const { type } = req.query as { type: "gallery" | "sticker" | "background" };
    const userId = req.userId!;

    const timestamp = Math.round(Date.now() / 1000);
    const params: Record<string, string | number> = { timestamp };
    let folder: string;
    let publicId: string | undefined;

    if (type === "sticker") {
      folder = "echotrace/stickers";
      params.folder = folder;
    } else if (type === "background") {
      folder = "echotrace/backgrounds";
      params.folder = folder;
    } else {
      folder = `echotrace/gallery/user_${userId}`;
      params.folder = folder;
    }

    const signature = cloudinary.getSignature(params);

    res.json(ApiResponse.success({
      signature,
      timestamp,
      folder,
      public_id: publicId,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    }));
  }

  async saveImage(req: AuthRequest, res: Response) {
    const userId = parseInt(req.userId!);
    const { url, publicId, width, height, size } = req.body;
    if (!url) throw new AppError("url is required", 400);

    const image = await userImageService.create({ userId, url, publicId, width, height, size });

    res.status(201).json(ApiResponse.success(image));
  }

  async listImages(req: AuthRequest, res: Response) {
    const userId = parseInt(req.userId!);
    const bookId = req.query.bookId ? parseInt(req.query.bookId as string) : undefined;

    const images = await userImageService.listByUser(userId, bookId);

    res.json(ApiResponse.success(images));
  }

  async deleteImage(req: AuthRequest, res: Response) {
    const userId = parseInt(req.userId!);
    const id = parseInt(String(req.params.id));
    await userImageService.delete(id, userId);
    res.json(ApiResponse.message("Image deleted"));
  }
}
