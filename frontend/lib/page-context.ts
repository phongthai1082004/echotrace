import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { getT } from "@/lib/i18n-server";

// ponytail: helper chung cho page server — lang từ cookie + token từ session,
// khỏi lặp 6 dòng ở mỗi page (mẫu explore/page.tsx).
export async function getPageContext() {
  const lng = (await cookies()).get("i18nextLng")?.value ?? "vi";
  const session = await getServerSession(authOptions);
  return {
    t: getT(lng),
    token: (session as any)?.accessToken as string | undefined,
  };
}
