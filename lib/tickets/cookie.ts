import "server-only";

import { cookies } from "next/headers";

export const TICKET_ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function ticketAccessCookieName(reference: string): string {
  return `helpdesk_ticket_${reference.toLowerCase()}`;
}

export async function setTicketAccessCookie(reference: string, token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ticketAccessCookieName(reference), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/tickets/${reference}`,
    maxAge: TICKET_ACCESS_COOKIE_MAX_AGE,
  });
}

export async function getTicketAccessCookie(reference: string): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ticketAccessCookieName(reference))?.value ?? null;
}
