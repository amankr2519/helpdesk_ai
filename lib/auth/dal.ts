import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";
import { authSessions, users } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { readSessionCookie } from "@/lib/auth/cookie";
import { verifySessionToken } from "@/lib/auth/jwt";

export type StaffPrincipal = {
  id: string;
  email: string;
  role: "admin" | "agent";
};

export class AuthorizationError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Authentication required." : "Administrator access required.");
    this.name = "AuthorizationError";
  }
}

export async function getCurrentStaff(): Promise<StaffPrincipal | null> {
  const token = await readSessionCookie();
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const now = new Date();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.id, claims.sid),
        eq(authSessions.userId, claims.sub),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, now),
        eq(users.isActive, true),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function requireAdmin(): Promise<StaffPrincipal> {
  const user = await getCurrentStaff();
  if (!user) throw new AuthorizationError(401);
  if (user.role !== "admin") throw new AuthorizationError(403);
  return user;
}

export async function revokeSessionToken(token: string | undefined): Promise<void> {
  if (!token) return;
  const claims = await verifySessionToken(token);
  if (!claims) return;

  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(authSessions.id, claims.sid),
        eq(authSessions.userId, claims.sub),
        isNull(authSessions.revokedAt),
      ),
    );
}
