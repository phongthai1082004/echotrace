// F41 V-16 zod: login/register/otp/updateProfile.
import { loginSchema, registerSchema, otpSchema, updateProfileSchema } from "@/lib/auth-schemas";

type SafeParse = { success: boolean; error?: { issues: { path: (string | number | symbol)[] }[] } };
const ok = (r: SafeParse) => expect(r.success).toBe(true);
const bad = (r: SafeParse, path?: string) => {
  expect(r.success).toBe(false);
  if (path) {
    expect(r.error?.issues.some((i) => i.path.join(".").startsWith(path))).toBe(true);
  }
};

describe("V-16 login", () => {
  it("valid passes", () => ok(loginSchema.safeParse({ email: "a@b.co", password: "x" })));
  it("bad email fails", () => bad(loginSchema.safeParse({ email: "not-an-email", password: "x" }), "email"));
  it("empty password fails", () => bad(loginSchema.safeParse({ email: "a@b.co", password: "" }), "password"));
});

describe("V-16 register", () => {
  const base = { email: "a@b.co", password: "secret1", confirmPassword: "secret1", name: "An" };
  it("valid passes", () => ok(registerSchema.safeParse(base)));
  it("bad email fails", () => bad(registerSchema.safeParse({ ...base, email: "xx" }), "email"));
  it("pass <6 fails (BVA 5/6)", () => {
    bad(registerSchema.safeParse({ ...base, password: "12345", confirmPassword: "12345" }), "password");
    ok(registerSchema.safeParse({ ...base, password: "123456", confirmPassword: "123456" }));
  });
  it("confirm mismatch fails", () =>
    bad(registerSchema.safeParse({ ...base, confirmPassword: "other1" }), "confirmPassword"));
  it("name >100 fails (BVA 100/101)", () => {
    ok(registerSchema.safeParse({ ...base, name: "n".repeat(100) }));
    bad(registerSchema.safeParse({ ...base, name: "n".repeat(101) }), "name");
  });
});

describe("V-16 otp", () => {
  it("6 digits pass", () => ok(otpSchema.safeParse({ email: "a@b.co", otp: "123456" })));
  it("OTP != 6 digits fails (5/7/letters)", () => {
    for (const otp of ["12345", "1234567", "abcdef", "12 456"]) {
      bad(otpSchema.safeParse({ email: "a@b.co", otp }), "otp");
    }
  });
  it("bad email fails", () => bad(otpSchema.safeParse({ email: "xx", otp: "123456" }), "email"));
});

describe("V-16 updateProfile", () => {
  it("valid + empty optionals pass", () =>
    ok(updateProfileSchema.safeParse({ name: "An", phone: "", avatar: "" })));
  it("phone regex: ^0\\d{8,10}$ (BVA 8/9/11/12 digits)", () => {
    ok(updateProfileSchema.safeParse({ name: "An", phone: "0901234567" }));
    for (const phone of ["901234567", "09012345", "090123456789", "+84901234567", "abcdefghij"]) {
      bad(updateProfileSchema.safeParse({ name: "An", phone }), "phone");
    }
  });
  it("name >100 fails", () => bad(updateProfileSchema.safeParse({ name: "n".repeat(101) }), "name"));
});
