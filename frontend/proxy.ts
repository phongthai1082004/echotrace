import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPPORTED_LANGS = ["en", "vi", "es"];
const DEFAULT_LANG = "en";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1];

  if (SUPPORTED_LANGS.includes(firstSegment)) {
    const response = NextResponse.rewrite(new URL(pathname.replace(`/${firstSegment}`, "") || "/", request.url));
    response.cookies.set("i18nextLng", firstSegment, { path: "/" });
    return response;
  }

  const cookie = request.cookies.get("i18nextLng")?.value;
  const lang = SUPPORTED_LANGS.includes(cookie || "") ? cookie! : DEFAULT_LANG;
  return NextResponse.redirect(new URL(`/${lang}${pathname}`, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)"],
};
