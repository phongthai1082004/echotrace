import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth.config";
import { apiFetch } from "@/lib/api.fetch";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }
  const token = (session as any).accessToken;
  if (!token) {
    return NextResponse.json({ success: false, message: "No access token in session" }, { status: 401 });
  }
  try {
    const res = await apiFetch<Response>(`/api/books/${id}`, token, { raw: true });
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
