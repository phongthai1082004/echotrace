import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ApiResponse } from "../middleware/api.response.js";
import { CloudinaryService } from "../services/cloudinary.service.js";

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
}
