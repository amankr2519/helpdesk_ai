import { NextResponse } from "next/server";
import { clearSessionCookie, readSessionCookie } from "@/lib/auth/cookie";
import { revokeSessionToken } from "@/lib/auth/dal";
import { hasSameOrigin } from "@/lib/http";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const token = await readSessionCookie();
    await revokeSessionToken(token ?? undefined);
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch {
    try {
      await clearSessionCookie();
    } catch {
      // Keep the response generic if cookie storage is unavailable too.
    }
    return NextResponse.json({ error: "Sign-out is temporarily unavailable." }, { status: 500 });
  }
}
