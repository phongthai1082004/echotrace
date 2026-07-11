import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../middleware/app.error.js";
import { sendOtpEmail } from "../../lib/mailer.js";
import { TokenType } from "../../enum/token.type.js"

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        avatar: user.avatar,
        role: user.role
      },
      accessToken: this.generateAccessToken(String(user.id)),
      refreshToken: await this.generateRefreshToken(String(user.id)),
    };
  }

  async sendOtp(email: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError("Email already registered", 409);

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hashed = await bcrypt.hash(otp, 10);

    await prisma.token.deleteMany({ where: { email, tokenType: TokenType.OTP } });

    await prisma.token.create({
      data: {
        email,
        refreshToken: hashed,
        tokenType: TokenType.OTP,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendOtpEmail(email, otp);
  }

  async verifyOtpAndRegister(email: string, otp: string, password: string) {
    const record = await prisma.token.findFirst({
      where: { email, tokenType: TokenType.OTP, isRevoked: false },
    });
    if (!record) throw new AppError("No OTP requested for this email", 400);
    if (Date.now() > record.expiresAt.getTime()) throw new AppError("OTP expired", 400);

    const valid = await bcrypt.compare(otp, record.refreshToken);
    if (!valid) throw new AppError("Invalid OTP", 400);

    await prisma.token.update({ where: { id: record.id }, data: { isRevoked: true } });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name: email.split("@")[0] },
    });

    return {
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        avatar: user.avatar,
        role: user.role
      },
      accessToken: this.generateAccessToken(String(user.id)),
      refreshToken: await this.generateRefreshToken(String(user.id)),
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) throw new AppError("invalid credentials", 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError("invalid credentials", 401);

    return {
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        avatar: user.avatar,
        role: user.role
      },
      accessToken: this.generateAccessToken(String(user.id)),
      refreshToken: await this.generateRefreshToken(String(user.id)),
    };
  }

  async logout(userId: string) {
    await prisma.token.updateMany({
      where: { userId: userId as any, isRevoked: false, tokenType: TokenType.SESSION },
      data: { isRevoked: true },
    });
  }

  async refresh(token: string) {
    let payload: { userId: string };
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    } catch {
      throw new AppError("invalid or expired refresh token", 401);
    }

    const existing = await prisma.token.findFirst({
      where: { refreshToken: token, isRevoked: false, tokenType: TokenType.SESSION },
    });
    if (!existing) throw new AppError("refresh token revoked", 401);

    return { accessToken: this.generateAccessToken(payload.userId) };
  }

  private generateAccessToken(userId: string) {
    return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "7d" });
  }

  private async generateRefreshToken(userId: string) {
    // Xoá token cũ trước khi tạo mới
    await prisma.token.deleteMany({ where: { userId: parseInt(userId), tokenType: TokenType.SESSION } });

    const rt = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "30d" });
    await prisma.token.create({
      data: {
        userId: parseInt(userId),
        refreshToken: rt,
        tokenType: TokenType.SESSION,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return rt;
  }
}
