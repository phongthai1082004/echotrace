import { cookies, headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { getT } from "@/lib/i18n-server";

// ponytail: helper chung cho page server — lang từ cookie + token THẬT.
// session.accessToken chỉ là chuỗi "client" giả (chống lộ token ra JS, xem auth.config),
// token thật chỉ đọc được từ httpOnly cookie qua getToken (kèm xoay vòng khi hết hạn).
export async function getPageContext() {
  const lng = (await cookies()).get("i18nextLng")?.value ?? "vi";
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const jwt = await getToken({
    req: { headers: { cookie: cookieHeader } } as any,
    secret: process.env.NEXTAUTH_SECRET,
  }).catch(() => null);
  return {
    t: getT(lng),
    token: (jwt as any)?.accessToken as string | undefined,
  };
}
