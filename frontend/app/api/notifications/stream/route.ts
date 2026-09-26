import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

// arrayBuffer nên không stream được). Auth bằng session cookie server-side.
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = (token as any)?.accessToken;
  if (!accessToken) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }
  const upstream = await fetch(`${BACKEND}/api/notifications/stream`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ success: false, message: "Stream unavailable" }, { status: upstream.status || 502 });
  }
  return new NextResponse(upstream.body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
