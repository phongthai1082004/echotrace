import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../middleware/app.error.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateEmail(name: string) {
  const suffix = Date.now().toString(36);
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, ".");
  return `${slug}.${suffix}@echotrace.local`;
}

export class AuthService {
  async loginWithGoogle(idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) throw new AppError("invalid google token", 401);

    let user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || "User",
          googleId: payload.sub,
          avatar: payload.picture,
        },
      });
    }
    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken: this.generateAccessToken(String(user.id)),
      refreshToken: this.generateRefreshToken(String(user.id)),
    };
  }

  async register(name: string, password: string) {
    const existing = await prisma.user.findFirst({ where: { name } });
    if (existing) throw new AppError("username already taken", 409);

    const email = generateEmail(name);
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
    });
    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken: this.generateAccessToken(String(user.id)),
      refreshToken: this.generateRefreshToken(String(user.id)),
    };
  }

  async login(credential: string, password: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: credential }, { name: credential }],
      },
    });
    if (!user || !user.password) throw new AppError("invalid credentials", 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError("invalid credentials", 401);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken: this.generateAccessToken(String(user.id)),
      refreshToken: this.generateRefreshToken(String(user.id)),
    };
  }

  async logout(userId: string) {
    await prisma.token.updateMany({
      where: { userId: userId as any, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  private generateAccessToken(userId: string) {
    return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "15m" });
  }

  private generateRefreshToken(userId: string) {
    return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });
  }
}
