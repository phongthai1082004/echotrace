import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { CloudinaryService } from "../services/cloudinary.service.js";
import { prisma } from "../../lib/prisma.js";

const cloudinary = new CloudinaryService();

export class UploadController {
  async getSignature(req: AuthRequest, res: Response) {
    const { type } = req.query as { type: "avatar" | "gallery" };
    const userId = req.userId!;

    const timestamp = Math.round(Date.now() / 1000);
    const params: Record<string, string | number> = { timestamp };
    let folder: string;
    let publicId: string | undefined;

    if (type === "avatar") {
      folder = "echotrace/avatar";
      publicId = `user_${userId}`;
      params.folder = folder;
      params.public_id = publicId;
      params.overwrite = 1;
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

    const image = await prisma.userImage.create({
      data: { userId, url, publicId: publicId || "", width: width || null, height: height || null, size: size || null },
    });

    res.status(201).json(ApiResponse.success(image));
  }

  async listImages(req: AuthRequest, res: Response) {
    const userId = parseInt(req.userId!);
    const bookId = req.query.bookId ? parseInt(req.query.bookId as string) : undefined;

    const images = await prisma.userImage.findMany({
      where: { userId, ...(bookId ? { bookId } : {}) },
      orderBy: { id: "desc" },
    });

    res.set("Cache-Control", "public, max-age=300");
    res.json(ApiResponse.success(images));
  }

  async deleteImage(req: AuthRequest, res: Response) {
    const userId = parseInt(req.userId!);
    const id = parseInt(req.params.id);

    const image = await prisma.userImage.findFirst({ where: { id, userId } });
    if (!image) throw new AppError("Image not found", 404);

    await prisma.userImage.delete({ where: { id } });

    res.json(ApiResponse.message("Image deleted"));
  }
}
