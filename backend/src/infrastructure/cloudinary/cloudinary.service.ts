import { injectable } from "tsyringe";
import { v2 as cloudinary } from "cloudinary";

export abstract class ICloudinaryService {
  abstract getSignature(params: Record<string, string | number>): string;
  abstract deleteAsset(publicId: string): Promise<any>;
}

@injectable()
export class CloudinaryService extends ICloudinaryService {
  getSignature(params: Record<string, string | number>) {
    return cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);
  }

  async deleteAsset(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  }
}
