import "server-only";

import { createHmac } from "node:crypto";
import { inArray, lt, sql } from "drizzle-orm";
import { authLoginAttempts } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { getJwtSecret } from "@/lib/env";

const WINDOW_MS = 15 * 60 * 1_000;
const LOCK_MS = 15 * 60 * 1_000;
const EMAIL_LIMIT = 8;
const IP_LIMIT = 30;

export type LoginAttemptKey = {
  keyHash: string;
  maxAttempts: number;
};

function hashKey(value: string): string {
  return createHmac("sha256", getJwtSecret()).update(`helpdesk-login-rate-limit:v1:${value}`).digest("hex");
}

export function getLoginAttemptKeys(email: string, clientIp: string | null): LoginAttemptKey[] {
  const keys: LoginAttemptKey[] = [
    { keyHash: hashKey(`email:${email}`), maxAttempts: EMAIL_LIMIT },
  ];
  if (clientIp) keys.push({ keyHash: hashKey(`ip:${clientIp}`), maxAttempts: IP_LIMIT });
  return keys;
}

export async function getLoginLockSeconds(keys: LoginAttemptKey[]): Promise<number> {
  const now = new Date();
  const rows = await db
    .select({ blockedUntil: authLoginAttempts.blockedUntil })
    .from(authLoginAttempts)
    .where(inArray(authLoginAttempts.keyHash, keys.map(({ keyHash }) => keyHash)));

  return rows.reduce((waitSeconds, row) => {
    if (!row.blockedUntil || row.blockedUntil <= now) return waitSeconds;
    return Math.max(waitSeconds, Math.ceil((row.blockedUntil.getTime() - now.getTime()) / 1_000));
  }, 0);
}

export async function recordFailedLogin(keys: LoginAttemptKey[]): Promise<void> {
  const now = new Date();
  const windowFloor = new Date(now.getTime() - WINDOW_MS);
  const blockedUntil = new Date(now.getTime() + LOCK_MS);

  for (const { keyHash, maxAttempts } of keys) {
    const nextAttemptCount = sql<number>`case
      when ${authLoginAttempts.windowStartedAt} <= ${windowFloor} then 1
      else ${authLoginAttempts.attemptCount} + 1
    end`;

    await db
      .insert(authLoginAttempts)
      .values({ keyHash, attemptCount: 1, windowStartedAt: now })
      .onConflictDoUpdate({
        target: authLoginAttempts.keyHash,
        set: {
          attemptCount: nextAttemptCount,
          windowStartedAt: sql`case
            when ${authLoginAttempts.windowStartedAt} <= ${windowFloor} then ${now}
            else ${authLoginAttempts.windowStartedAt}
          end`,
          blockedUntil: sql`case
            when ${nextAttemptCount} >= ${maxAttempts} then ${blockedUntil}
            else null
          end`,
        },
      });
  }

  await db
    .delete(authLoginAttempts)
    .where(lt(authLoginAttempts.windowStartedAt, new Date(now.getTime() - 2 * 24 * 60 * 60 * 1_000)));
}

export async function clearLoginAttempts(keys: LoginAttemptKey[]): Promise<void> {
  await db
    .delete(authLoginAttempts)
    .where(inArray(authLoginAttempts.keyHash, keys.map(({ keyHash }) => keyHash)));
}

export function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const candidate = forwardedFor || realIp;
  if (!candidate || candidate.length > 64 || !/^[0-9a-fA-F:.]+$/.test(candidate)) return null;
  return candidate.toLowerCase();
}
