import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { getJwtSecret } from "@/lib/env";

const ISSUER = "help-desk-ai";
const AUDIENCE = "help-desk-admin";
const JWT_ALGORITHM = "HS256";
export const SESSION_DURATION_SECONDS = 4 * 60 * 60;

const sessionClaimsSchema = z.object({
  sub: z.string().uuid(),
  sid: z.string().uuid(),
  exp: z.number().int(),
});

function signingKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

export async function signSessionToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(signingKey());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: [JWT_ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
      requiredClaims: ["sub", "sid", "iat", "exp"],
      maxTokenAge: `${SESSION_DURATION_SECONDS}s`,
    });

    const result = sessionClaimsSchema.safeParse(payload);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
