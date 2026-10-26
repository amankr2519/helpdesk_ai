import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ticketEvents, tickets } from "@/lib/db/schema";
import {
  deriveTicketAccessToken,
  findTicketBySubmissionKey,
  hashTicketAccessToken,
} from "@/lib/tickets/access";
import { setTicketAccessCookie } from "@/lib/tickets/cookie";
import {
  hasSameOrigin,
  InvalidRequestError,
  PayloadTooLargeError,
  readJsonBody,
} from "@/lib/http";
import { ticketCreateRequestSchema } from "@/lib/validation";
import { consumePublicRateLimit } from "@/lib/public-rate-limit";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function makeTicketReference(): string {
  return `HD-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function createResponse(reference: string, duplicate = false) {
  return NextResponse.json(
    { reference, ticketUrl: `/tickets/${reference}`, duplicate },
    { status: 201, headers: NO_STORE_HEADERS },
  );
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: NO_STORE_HEADERS });
  }

  try {
    const limit = await consumePublicRateLimit(request, "ticket-create", 10, 60 * 60);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many ticket submissions from this network. Please try again later." },
        { status: 429, headers: { ...NO_STORE_HEADERS, "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
  } catch {
    return NextResponse.json({ error: "We couldn’t save the ticket right now. Please try again." }, { status: 503, headers: NO_STORE_HEADERS });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, 64 * 1_024);
  } catch (error) {
    const status = error instanceof PayloadTooLargeError ? 413 : 400;
    const message = error instanceof InvalidRequestError
      ? error.message
      : status === 413
        ? "The ticket is too large to submit."
        : "Invalid request.";
    return NextResponse.json({ error: message }, { status, headers: NO_STORE_HEADERS });
  }

  const parsed = ticketCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the highlighted fields and try again.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const {
    submissionKey,
    title,
    description,
    category,
    priority,
    contactEmail,
    aiSummary,
  } = parsed.data;
  const token = deriveTicketAccessToken(submissionKey);
  const trackingTokenHash = hashTicketAccessToken(token);

  try {
    const [existing] = await findTicketBySubmissionKey(submissionKey);
    if (existing) {
      if (existing.trackingTokenHash !== trackingTokenHash) {
        return NextResponse.json({ error: "This submission could not be resumed. Please create a new ticket." }, { status: 409, headers: NO_STORE_HEADERS });
      }
      await setTicketAccessCookie(existing.reference, token);
      return createResponse(existing.reference, true);
    }

    const ticketId = randomUUID();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const reference = makeTicketReference();
      try {
        await db.batch([
          db.insert(tickets).values({
            id: ticketId,
            reference,
            submissionKey,
            trackingTokenHash,
            title,
            description,
            category,
            priority,
            contactEmail: contactEmail || null,
            aiSummary: aiSummary || null,
          }),
          db.insert(ticketEvents).values({
            ticketId,
            eventType: "created",
            toStatus: "open",
            toPriority: priority,
          }),
        ] as const);

        await setTicketAccessCookie(reference, token);
        return createResponse(reference);
      } catch (error) {
        const [duplicate] = await findTicketBySubmissionKey(submissionKey);
        if (duplicate && duplicate.trackingTokenHash === trackingTokenHash) {
          await setTicketAccessCookie(duplicate.reference, token);
          return createResponse(duplicate.reference, true);
        }
        if (isUniqueViolation(error) && attempt < 2) continue;
        return NextResponse.json(
          { error: "We couldn’t save the ticket right now. Please try again." },
          { status: 500, headers: NO_STORE_HEADERS },
        );
      }
    }
  } catch {
    return NextResponse.json(
      { error: "We couldn’t save the ticket right now. Please try again." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    { error: "We couldn’t create a unique ticket reference. Please try again." },
    { status: 500, headers: NO_STORE_HEADERS },
  );
}
