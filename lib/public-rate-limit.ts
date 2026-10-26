import "server-only";

import { createHmac } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { publicRequestRateLimits } from "@/lib/db/schema";
import { getClientIp } from "@/lib/auth/rate-limit";
import { getJwtSecret } from "@/lib/env";

export type PublicRateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

let lastCleanupAt = 0;

export async function consumePublicRateLimit(
  request: Request,
  endpoint: "assistant" | "ticket-create",
  limit: number,
  windowSeconds: number,
): Promise<PublicRateLimitResult> {
  const ip = getClientIp(request) ?? "unresolved-client";
  const keyHash = createHmac("sha256", getJwtSecret())
    .update(`helpdesk-public-rate-limit:v1:${endpoint}:${ip}`)
    .digest("hex");
  const now = new Date();
  const windowFloor = new Date(now.getTime() - windowSeconds * 1_000);

  const [row] = await db
    .insert(publicRequestRateLimits)
    .values({ keyHash, requestCount: 1, windowStartedAt: now })
    .onConflictDoUpdate({
      target: publicRequestRateLimits.keyHash,
      set: {
        requestCount: sql`case
          when ${publicRequestRateLimits.windowStartedAt} <= ${windowFloor} then 1
          else ${publicRequestRateLimits.requestCount} + 1
        end`,
        windowStartedAt: sql`case
          when ${publicRequestRateLimits.windowStartedAt} <= ${windowFloor} then ${now}
          else ${publicRequestRateLimits.windowStartedAt}
        end`,
      },
    })
    .returning({
      requestCount: publicRequestRateLimits.requestCount,
      windowStartedAt: publicRequestRateLimits.windowStartedAt,
    });

  if (now.getTime() - lastCleanupAt > 60 * 60 * 1_000) {
    lastCleanupAt = now.getTime();
    try {
      await db
        .delete(publicRequestRateLimits)
        .where(lt(publicRequestRateLimits.windowStartedAt, new Date(now.getTime() - 24 * 60 * 60 * 1_000)));
    } catch {
      // Cleanup is best effort; the current rate-limit decision has already been recorded.
    }
  }

  if (!row || row.requestCount <= limit) return { allowed: true };
  const elapsedSeconds = Math.floor((now.getTime() - row.windowStartedAt.getTime()) / 1_000);
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, windowSeconds - elapsedSeconds),
  };
}
