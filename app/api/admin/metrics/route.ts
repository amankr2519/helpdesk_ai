import { NextResponse } from "next/server";
import { AuthorizationError, requireAdmin } from "@/lib/auth/dal";
import { getTicketMetrics } from "@/lib/admin/tickets";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getTicketMetrics(), { headers });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Administrator access required." }, { status: error.status, headers });
    }
    return NextResponse.json({ error: "Metrics are temporarily unavailable." }, { status: 500, headers });
  }
}
