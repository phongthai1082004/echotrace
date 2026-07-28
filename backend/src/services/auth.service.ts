import { injectable } from "tsyringe";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../middleware/app.error.js";
import { ErrorCode } from "../errors/error-codes.js";
import { sendOtpEmail } from "../../lib/mailer.js";
import { TokenType } from "../../enum/token.type.js";
import { AuthResponseDTO, AuthMapper } from "../dto/auth/auth.dto.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export abstract class IAuthService {
  abstract loginWithGoogle(idToken: string): Promise<AuthResponseDTO>;
  abstract sendOtp(email: string): Promise<void>;
  abstract verifyOtpAndRegister(email: string, otp: string, password: string): Promise<AuthResponseDTO>;
  abstract login(email: string, password: string): Promise<AuthResponseDTO>;
  abstract logout(userId: string): Promise<void>;
  abstract refresh(token: string): Promise<{ accessToken: string }>;
}

@injectable()
export class AuthService extends IAuthService {
  async loginWithGoogle(idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) throw new AppError(ErrorCode.AUTH_INVALID_GOOGLE_TOKEN, 401);

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || "User",
          googleId: payload.sub,
          avatar: payload.picture,
          status: "active",
        },
      });
    } else if (user.status === "banned") {
      throw new AppError(ErrorCode.AUTH_ACCOUNT_BANNED, 403);
    }
    return AuthMapper.toAuthResponse(user, this.generateAccessToken(String(user.id)), await this.generateRefreshToken(String(user.id)));
  }

  async sendOtp(email: string) {
    const existing = await prisma.user.findFirst({
      where: { email, isDelete: false },
    });
    if (existing) throw new AppError(ErrorCode.AUTH_EMAIL_EXISTS, 409);

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
    if (!record) throw new AppError(ErrorCode.AUTH_OTP_NOT_REQUESTED, 400);
    if (Date.now() > record.expiresAt.getTime()) throw new AppError(ErrorCode.AUTH_OTP_EXPIRED, 400);

    const valid = await bcrypt.compare(otp, record.refreshToken);
    if (!valid) throw new AppError(ErrorCode.AUTH_INVALID_OTP, 400);

    await prisma.token.update({ where: { id: record.id }, data: { isRevoked: true } });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed, name: email.split("@")[0], status: "active" } });

    return AuthMapper.toAuthResponse(user, this.generateAccessToken(String(user.id)), await this.generateRefreshToken(String(user.id)));
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { email, isDelete: false },
    });
    if (!user || !user.password) throw new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 401);
    if (user.status === "banned") throw new AppError(ErrorCode.AUTH_ACCOUNT_BANNED, 403);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 401);

    return AuthMapper.toAuthResponse(user, this.generateAccessToken(String(user.id)), await this.generateRefreshToken(String(user.id)));
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
      throw new AppError(ErrorCode.AUTH_INVALID_REFRESH_TOKEN, 401);
    }

    const existing = await prisma.token.findFirst({
      where: { refreshToken: token, isRevoked: false, tokenType: TokenType.SESSION },
    });
    if (!existing) throw new AppError(ErrorCode.AUTH_REFRESH_TOKEN_REVOKED, 401);

    return { accessToken: this.generateAccessToken(payload.userId) };
  }

  private generateAccessToken(userId: string) {
    return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "1h" });
  }

  private async generateRefreshToken(userId: string) {
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
