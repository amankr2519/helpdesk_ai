import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, authSessions } from "@/lib/db/schema";
import { burnPasswordCheck, verifyPassword } from "@/lib/auth/password";
import {
  clearLoginAttempts,
  getClientIp,
  getLoginAttemptKeys,
  getLoginLockSeconds,
  recordFailedLogin,
} from "@/lib/auth/rate-limit";
import {
  hasSameOrigin,
  InvalidRequestError,
  PayloadTooLargeError,
  readJsonBody,
} from "@/lib/http";
import { setSessionCookie } from "@/lib/auth/cookie";
import { signSessionToken, SESSION_DURATION_SECONDS } from "@/lib/auth/jwt";
import { staffLoginSchema } from "@/lib/validation";

const GENERIC_LOGIN_ERROR = "Invalid email or password.";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, 8_192);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    if (error instanceof InvalidRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const credentials = staffLoginSchema.safeParse(body);
  if (!credentials.success) {
    return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
  }

  const { email, password } = credentials.data;
  const keys = getLoginAttemptKeys(email, getClientIp(request));

  try {
    const lockSeconds = await getLoginLockSeconds(keys);
    if (lockSeconds > 0) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(lockSeconds) } },
      );
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const passwordMatches = user
      ? await verifyPassword(password, user.passwordHash)
      : await burnPasswordCheck(password);

    if (!user || !passwordMatches || !user.isActive) {
      await recordFailedLogin(keys);
      return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
    }

    await clearLoginAttempts(keys);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_SECONDS * 1_000);
    const sessionId = randomUUID();
    const token = await signSessionToken(user.id, sessionId);

    await db.insert(authSessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
    });
    await setSessionCookie(token, expiresAt);

    return NextResponse.json({
      user: { email: user.email, role: user.role },
    });
  } catch {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 500 });
  }
}
