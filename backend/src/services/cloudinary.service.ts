import { v2 as cloudinary } from "cloudinary";

export class CloudinaryService {
  getSignature(params: Record<string, string | number>) {
    return cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);
  }
}
