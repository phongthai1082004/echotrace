import { prisma } from "../../lib/prisma.js";
import { AppError } from "../middleware/app.error.js";

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: {id: parseInt(userId)},
      select: {
        id: true, email: true, username: true, name: true,
        avatar: true, phone: true, address: true, city: true,
        role: true, status: true,
      },
    });
    if (!user) throw new AppError("User not found!", 404);
    return user;
  }
}
