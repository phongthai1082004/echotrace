import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const SUPPORTED_LANGS = ["en", "vi", "es"];
const DEFAULT_LANG = "vi";
const BACKEND = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

let flagCache: { at: number; on: boolean } | null = null;
let downStreak = 0;
// Cache 10' để Neon được ngủ (cần 5' im lặng). Bật bảo trì khẩn thì restart
// frontend cho ăn ngay, khỏi chờ cache hết hạn.
async function maintenanceState(): Promise<{ on: boolean; down: boolean }> {
  if (flagCache && Date.now() - flagCache.at < 600_000) {
    return { on: flagCache.on, down: downStreak >= 2 };
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${BACKEND}/api/maintenance/status`, { signal: ctrl.signal });
    clearTimeout(timer);
    const json = await res.json().catch(() => null);
    flagCache = { at: Date.now(), on: json?.data?.active === true };
    downStreak = 0;
    return { on: flagCache.on, down: false };
  } catch {
    downStreak += 1;
    const on = flagCache?.on ?? false;
    flagCache = { at: Date.now(), on };
    return { on, down: downStreak >= 2 };
  }
}

function langOf(request: NextRequest, firstSegment: string): string {
  if (SUPPORTED_LANGS.includes(firstSegment)) return firstSegment;
  const cookie = request.cookies.get("i18nextLng")?.value;
  return SUPPORTED_LANGS.includes(cookie || "") ? cookie! : DEFAULT_LANG;
}

function rewriteWithLang(request: NextRequest, pathname: string, lang: string) {
  const url = new URL(pathname, request.url);
  url.search = request.nextUrl.search;
  // expose the lang to server components on this request (cookie only lands on the response)
  const headers = new Headers(request.headers);
  headers.set("x-i18n-lang", lang);
  const response = NextResponse.rewrite(url, { request: { headers } });
  response.cookies.set("i18nextLng", lang, { path: "/" });
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const firstSegment = pathname.split("/")[1];
  const bare = SUPPORTED_LANGS.includes(firstSegment) ? pathname.replace(`/${firstSegment}`, "") || "/" : pathname;

  if (bare !== "/maintenance") {
    const { on, down } = await maintenanceState();
    if (down) return rewriteWithLang(request, "/maintenance", langOf(request, firstSegment));
    if (on && bare !== "/auth" && !bare.startsWith("/auth/")) {
      try {
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if ((token as any)?.role !== "admin") {
          return rewriteWithLang(request, "/maintenance", langOf(request, firstSegment));
        }
      } catch {
        /* fail-open: không chặn khi không đọc được token */
      }
    }
  }

  if (SUPPORTED_LANGS.includes(firstSegment)) {
    return rewriteWithLang(request, pathname.replace(`/${firstSegment}`, "") || "/", firstSegment);
  }

  const cookie = request.cookies.get("i18nextLng")?.value;
  const lang = SUPPORTED_LANGS.includes(cookie || "") ? cookie! : DEFAULT_LANG;
  const url = new URL(`/${lang}${pathname}`, request.url);
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)"],
};
