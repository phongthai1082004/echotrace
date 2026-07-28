import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPPORTED_LANGS = ["en", "vi", "es"];
const DEFAULT_LANG = "en";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const firstSegment = pathname.split("/")[1];

  if (SUPPORTED_LANGS.includes(firstSegment)) {
    const url = new URL(pathname.replace(`/${firstSegment}`, "") || "/", request.url);
    url.search = search;
    const response = NextResponse.rewrite(url);
    response.cookies.set("i18nextLng", firstSegment, { path: "/" });
    return response;
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
