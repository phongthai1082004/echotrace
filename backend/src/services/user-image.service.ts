import { BaseService } from "../utils/base.service.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../middleware/app.error.js";
import type { UserImageModel } from "../../generated/prisma/models/UserImage.js";

const userImageBase = new BaseService<UserImageModel>(prisma.userImage);

export class UserImageService {
  public async softDelete(id: number) {
    await userImageBase.delete(id);
  }

  public async hardDelete(id: number) {
    await userImageBase.hardDelete(id);
  }

  public async findAll(filter: any, options?: any) {
    return await userImageBase.findAll(filter, options);
  }

  public async findById(id: number, extraWhere: Record<string, any> = {}) {
    return await userImageBase.findById(id, extraWhere);
  }

  public async update(id: number, data: any, extraWhere: Record<string, any> = {}) {
    return await userImageBase.update(id, data, extraWhere);
  }

  public async getById(id: number, userId: number) {
    const image = await userImageBase.findById(id, { userId });
    return image;
  }

  public async create(data: { userId: number; url: string; publicId?: string; width?: number; height?: number; size?: number }) {
    return userImageBase.create(data);
  }

  public async listByUser(userId: number, bookId?: number) {
    return userImageBase.delegate.findMany({
      where: { userId, ...(bookId ? { bookId } : {}) },
      orderBy: { id: "desc" },
    });
  }

  public async delete(id: number, userId: number) {
    const image = await this.getById(id, userId);
    if (!image) throw new AppError("Image not found", 404);
    await userImageBase.delete(id);
    if (image.publicId) {
      const { CloudinaryService } = await import("./cloudinary.service.js");
      const cloudinary = new CloudinaryService();
      await cloudinary.deleteAsset(image.publicId).catch(() => {});
    }
  }
}
