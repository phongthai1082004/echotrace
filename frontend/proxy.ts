import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/", "/auth"];
const customerPaths = ["/explore", "/my-journals", "/studio", "/orders", "/checkout", "/account"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role;

  const isPublic = publicPaths.some((p) => path === p || path.startsWith(p + "/"));
  const isCustomer = customerPaths.some((p) => path === p || path.startsWith(p + "/"));
  const isAdmin = path.startsWith("/admin");

  if (!token) {
    if (isPublic) return NextResponse.next();
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  if (isAdmin && role !== "admin") return NextResponse.redirect(new URL("/explore", req.url));
  if (isCustomer && role === "admin") return NextResponse.redirect(new URL("/admin/orders", req.url));
  if (isPublic && role === "admin") return NextResponse.redirect(new URL("/admin/orders", req.url));
  if (isPublic && role !== "admin") return NextResponse.redirect(new URL("/explore", req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|favicon.ico).*)"],
};
