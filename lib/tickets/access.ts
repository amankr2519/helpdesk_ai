import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { getJwtSecret } from "@/lib/env";
import type { PublicTicketDTO } from "@/lib/domain";

export function deriveTicketAccessToken(submissionKey: string): string {
  return createHmac("sha256", getJwtSecret())
    .update(`helpdesk-ticket-access:v1:${submissionKey}`)
    .digest("base64url");
}

export function hashTicketAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function matchesStoredToken(token: string, storedHash: string): boolean {
  const actual = Buffer.from(hashTicketAccessToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function getTrackedTicket(
  reference: string,
  token: string | null,
): Promise<PublicTicketDTO | null> {
  if (!token || token.length > 128) return null;

  const [ticket] = await db
    .select({
      id: tickets.id,
      reference: tickets.reference,
      title: tickets.title,
      description: tickets.description,
      category: tickets.category,
      priority: tickets.priority,
      status: tickets.status,
      aiSummary: tickets.aiSummary,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      trackingTokenHash: tickets.trackingTokenHash,
    })
    .from(tickets)
    .where(eq(tickets.reference, reference))
    .limit(1);

  if (!ticket || !matchesStoredToken(token, ticket.trackingTokenHash)) return null;

  return {
    id: ticket.id,
    reference: ticket.reference,
    title: ticket.title,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    aiSummary: ticket.aiSummary,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export async function findTicketBySubmissionKey(submissionKey: string) {
  return db
    .select({
      id: tickets.id,
      reference: tickets.reference,
      trackingTokenHash: tickets.trackingTokenHash,
    })
    .from(tickets)
    .where(eq(tickets.submissionKey, submissionKey))
    .limit(1);
}
