import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { apiFetch } from "@/lib/api.fetch";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET! });
  if (!token?.accessToken) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }
  try {
    const res = await apiFetch<Response>(`/api/books/${id}`, token.accessToken, { raw: true });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ success: false, message: text.slice(0, 200) }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
