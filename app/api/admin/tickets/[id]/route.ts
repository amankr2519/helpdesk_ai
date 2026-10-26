import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireAdmin } from "@/lib/auth/dal";
import { getAdminTicket, updateAdminTicket } from "@/lib/admin/tickets";
import { hasSameOrigin, InvalidRequestError, PayloadTooLargeError, readJsonBody } from "@/lib/http";
import { adminTicketUpdateSchema } from "@/lib/validation";

const headers = { "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404, headers });
    }
    const ticket = await getAdminTicket(id);
    if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404, headers });
    return NextResponse.json(ticket, { headers });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Administrator access required." }, { status: error.status, headers });
    }
    return NextResponse.json({ error: "Ticket details are temporarily unavailable." }, { status: 500, headers });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403, headers });
  }

  let staff;
  try {
    staff = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Administrator access required." }, { status: error.status, headers });
    }
    return NextResponse.json({ error: "Ticket update is temporarily unavailable." }, { status: 500, headers });
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404, headers });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, 4 * 1_024);
  } catch (error) {
    const status = error instanceof PayloadTooLargeError ? 413 : 400;
    const message = error instanceof InvalidRequestError
      ? error.message
      : status === 413 ? "The update is too large." : "Invalid request.";
    return NextResponse.json({ error: message }, { status, headers });
  }

  const parsed = adminTicketUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid status or priority to update." }, { status: 400, headers });
  }

  try {
    const exists = await updateAdminTicket(id, staff.id, parsed.data);
    if (!exists) return NextResponse.json({ error: "Ticket not found." }, { status: 404, headers });
    return NextResponse.json(await getAdminTicket(id), { headers });
  } catch {
    return NextResponse.json({ error: "Ticket update is temporarily unavailable." }, { status: 500, headers });
  }
}
