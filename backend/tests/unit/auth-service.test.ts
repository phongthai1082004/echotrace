/**
 * Plan section 2.4 -- Auth service / JWT lifecycle (S-25..S-29).
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { mock } from "jest-mock-extended";
import { PasswordService } from "../../src/modules/authentication/password/password.service.js";
import { SessionService } from "../../src/modules/authentication/sessions/sessions.service.js";
import { AuthRepository } from "../../src/modules/authentication/repositories/auth.repository.js";

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-id";

const build = () => {
  const repo = mock<AuthRepository>();
  return { password: new PasswordService(repo), sessions: new SessionService(repo), repo };
};

const activeUser = { id: 5, email: "a@b.c", role: "user", isDelete: false, name: "Ann" };

describe("token lifecycle (S-25..S-28)", () => {
  it("S-25: access token = 1h, signed with ACCESS secret, carries userId + role", async () => {
    const { password, repo } = build();
    (repo.findActiveUserByEmailFull as jest.Mock).mockResolvedValue({ ...activeUser, password: bcrypt.hashSync("pw", 4) });
    (repo.createSessionToken as jest.Mock).mockResolvedValue({});
    const res = await password.login("a@b.c", "pw");
    const decoded = jwt.verify(res.accessToken, process.env.JWT_ACCESS_SECRET!) as any;
    expect(decoded.userId).toBe("5");
    expect(decoded.role).toBe("user");
    expect(decoded.exp - decoded.iat).toBe(3600);
    // refresh token signed with REFRESH secret, 30d
    const r = jwt.verify(res.refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    expect(r.exp - r.iat).toBe(30 * 24 * 3600);
    expect(repo.createSessionToken).toHaveBeenCalledWith(5, res.refreshToken, expect.any(Date));
  });

  it("S-26/S-27: refresh rotates (old row deleted, new token issued)", async () => {
    const { sessions, repo } = build();
    const old = jwt.sign({ userId: "5" }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "30d" });
    (repo.findSessionByToken as jest.Mock).mockResolvedValue({ id: 9 });
    (repo.findUserByIdRole as jest.Mock).mockResolvedValue(activeUser);
    (repo.rotateSessionToken as jest.Mock).mockResolvedValue({});
    // rotate issues a fresh token: shift the clock so the new JWT differs from `old`
    const realNow = Date.now;
    const spy = jest.spyOn(Date, "now").mockReturnValue(realNow.call(Date) + 5000);
    const res = await sessions.refresh(old);
    spy.mockRestore();
    expect(res.refreshToken).not.toBe(old);
    expect(jwt.verify(res.refreshToken, process.env.JWT_REFRESH_SECRET!)).toMatchObject({ userId: "5" });
    expect(repo.rotateSessionToken).toHaveBeenCalledWith(9, 5, res.refreshToken, expect.any(Date));
  });

  it("S-27b: expired refresh token -> AUTH_INVALID_REFRESH_TOKEN 401", async () => {
    const { sessions, repo } = build();
    const dead = jwt.sign({ userId: "5" }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "-1h" });
    await expect(sessions.refresh(dead)).rejects.toMatchObject({ statusCode: 401 });
    expect(repo.findSessionByToken).not.toHaveBeenCalled();
  });

  it("S-27c: revoked (row deleted) -> AUTH_REFRESH_TOKEN_REVOKED 401", async () => {
    const { sessions, repo } = build();
    const tok = jwt.sign({ userId: "5" }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "30d" });
    (repo.findSessionByToken as jest.Mock).mockResolvedValue(null);
    await expect(sessions.refresh(tok)).rejects.toMatchObject({ statusCode: 401, errorCode: "AUTH_REFRESH_TOKEN_REVOKED" });
  });

  it("S-28b: two logins in the same second issue different refresh tokens (jti)", async () => {
    const { password, repo } = build();
    (repo.findActiveUserByEmailFull as jest.Mock).mockResolvedValue({ ...activeUser, password: bcrypt.hashSync("pw", 4) });
    (repo.createSessionToken as jest.Mock).mockResolvedValue({});
    const a = await password.login("a@b.c", "pw");
    const b = await password.login("a@b.c", "pw");
    expect(a.refreshToken).not.toBe(b.refreshToken);
  });

  it("S-28: secret-swap -- an ACCESS-secret token is not a valid refresh token", async () => {
    const { sessions, repo } = build();
    const access = jwt.sign({ userId: "5" }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "1h" });
    await expect(sessions.refresh(access)).rejects.toMatchObject({ statusCode: 401 });
    expect(repo.findSessionByToken).not.toHaveBeenCalled();
  });
});

describe("login guards (S-29)", () => {
  it("wrong password -> AUTH_INVALID_CREDENTIALS 401", async () => {
    const { password, repo } = build();
    (repo.findActiveUserByEmailFull as jest.Mock).mockResolvedValue({ ...activeUser, password: bcrypt.hashSync("pw", 4) });
    await expect(password.login("a@b.c", "wrong")).rejects.toMatchObject({ statusCode: 401, errorCode: "AUTH_INVALID_CREDENTIALS" });
  });

  it("banned account -> AUTH_ACCOUNT_BANNED 403", async () => {
    const { password, repo } = build();
    (repo.findActiveUserByEmailFull as jest.Mock).mockResolvedValue({ ...activeUser, password: bcrypt.hashSync("pw", 4), isDelete: true });
    await expect(password.login("a@b.c", "pw")).rejects.toMatchObject({ statusCode: 403, errorCode: "AUTH_ACCOUNT_BANNED" });
  });
});
