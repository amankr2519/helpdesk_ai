import { NextResponse } from "next/server";
import { AuthorizationError, requireAdmin } from "@/lib/auth/dal";
import { getTicketQueue } from "@/lib/admin/tickets";
import { adminTicketFiltersSchema } from "@/lib/validation";

const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const searchParams = new URL(request.url).searchParams;
    const parsed = adminTicketFiltersSchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Ticket filters are invalid." }, { status: 400, headers });
    }

    return NextResponse.json(await getTicketQueue(parsed.data), { headers });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Administrator access required." }, { status: error.status, headers });
    }
    return NextResponse.json({ error: "Tickets are temporarily unavailable." }, { status: 500, headers });
  }
}
