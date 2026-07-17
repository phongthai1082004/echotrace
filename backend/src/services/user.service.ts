import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../middleware/app.error.js";
import { PaginationConfig, QueryProcessor } from "../utils/pagination.js";
import { UserMapper } from "../dto/user/user.list.js";

export class UserService {
  async getUserList(params: PaginationConfig ) {
    const queryConfig = new QueryProcessor(params).build();
    const users = await prisma.user.findMany(queryConfig);
    return UserMapper.toDTOList(users);
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: {id: parseInt(userId)},
      select: {
        id: true, email: true, name: true,
        avatar: true, phone: true, address: true, city: true,
        role: true, status: true, password: true,
      },
    });
    if (!user) throw new AppError("User not found!", 404);
    const { password, ...safe } = user;
    return { ...safe, hasPassword: !!password };
  }

  async updateProfile(userId: string, data: { name: string; phone?: string; address: string; city: string }) {
    if (data.phone) {
      const cleaned = data.phone.replace(/\s+/g, "");
      if (!/^(\+84|0)[1-9]\d{8,9}$/.test(cleaned)) {
        throw new AppError("Invalid phone format", 400);
      }
      const dupPhone = await prisma.user.findFirst({ where: { phone: cleaned } });
      if (dupPhone && dupPhone.id !== parseInt(userId)) {
        throw new AppError("Phone number already in use", 409);
      }
      data.phone = cleaned;
    }

    try {
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data,
      });
      return this.getProfile(userId);
    } catch (error: any) {
      if (error && error.code === "P2025") {
        throw new AppError("User not found for update!", 404);
      }
      throw error;
    }
  }

  async changePassword(userId: string, body: { currentPassword?: string; newPassword: string }) {
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) throw new AppError("User not found", 404);

    if (user.password) {
      if (!body.currentPassword) throw new AppError("Current password is required", 400);
      const valid = await bcrypt.compare(body.currentPassword, user.password);
      if (!valid) throw new AppError("Current password is incorrect", 400);
    }

    if (body.newPassword.length < 6) throw new AppError("New password must be at least 6 characters", 400);

    const hashed = await bcrypt.hash(body.newPassword, 10);
    await prisma.user.update({ where: { id: parseInt(userId) }, data: { password: hashed } });
    return { message: "Password updated successfully" };
  }

  async saveAvatarUrl(userId: string, url: string) {
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { avatar: url },
    });
    return this.getProfile(userId);
  }
}
