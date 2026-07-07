import { prisma } from "../../lib/prisma.js";
import { AppError } from "../middleware/app.error.js";

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true, email: true, username: true, name: true,
        avatar: true, phone: true, address: true, city: true,
        role: true, status: true,
      },
    });
    if (!user) throw new AppError("user not found", 404);
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string; address?: string; city?: string; avatar?: string }) {
    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data,
      select: {
        id: true, email: true, username: true, name: true,
        avatar: true, phone: true, address: true, city: true,
        role: true, status: true,
      },
    });
    return user;
  }

  async getUserBooks(userId: string) {
    return prisma.travelBook.findMany({
      where: { userId: parseInt(userId), status: "PUBLISHED" },
      select: {
        id: true, title: true, coverUrl: true, pages: true,
        style: true, status: true,
        user: { select: { name: true, username: true, avatar: true } },
      },
      orderBy: { id: "desc" },
    });
  }

  async getUsers() {
    return prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true, username: true, name: true, avatar: true,
        _count: { select: { travelBooks: { where: { status: "PUBLISHED" } } } },
      },
      orderBy: { id: "asc" },
    });
  }

  async getOtherUserBooks(otherUserId: number) {
    const user = await prisma.user.findUnique({ where: { id: otherUserId } });
    if (!user) throw new AppError("user not found", 404);

    return prisma.travelBook.findMany({
      where: { userId: otherUserId, status: "PUBLISHED" },
      select: {
        id: true, title: true, coverUrl: true, pages: true,
        style: true,
        user: { select: { name: true, username: true, avatar: true } },
      },
      orderBy: { id: "desc" },
    });
  }
}
