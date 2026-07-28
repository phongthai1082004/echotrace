import { injectable, inject } from "tsyringe";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { AppError } from "../middleware/app.error.js";
import { ErrorCode } from "../errors/error-codes.js";
import { ICloudinaryService } from "../infrastructure/cloudinary/cloudinary.service.js";
import { IUserImageService } from "../services/user-image.service.js";

@injectable()
export class UploadController {
  constructor(
    @inject("ICloudinaryService") private readonly cloudinary: ICloudinaryService,
    @inject("IUserImageService") private readonly userImageService: IUserImageService,
  ) {}

  getSignature = async (req: AuthRequest, res: Response) => {
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

    const signature = this.cloudinary.getSignature(params);

    res.json(ApiResponse.success({
      signature,
      timestamp,
      folder,
      public_id: publicId,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    }));
  };

  saveImage = async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.userId!);
    const { url, publicId, width, height, size } = req.body;
    if (!url) throw new AppError(ErrorCode.UPLOAD_URL_REQUIRED, 400);

    const image = await this.userImageService.create({ userId, url, publicId, width, height, size });

    res.status(201).json(ApiResponse.success(image));
  };

  listImages = async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.userId!);
    const bookId = req.query.bookId ? parseInt(req.query.bookId as string) : undefined;

    const images = await this.userImageService.listByUser(userId, bookId);

    res.json(ApiResponse.success(images));
  };

  deleteImage = async (req: AuthRequest, res: Response) => {
    const userId = parseInt(req.userId!);
    const id = parseInt(String(req.params.id));
    await this.userImageService.delete(id, userId);
    res.json(ApiResponse.message("Image deleted"));
  };
}
