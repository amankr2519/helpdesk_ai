import { NextResponse } from "next/server";
import { generateTroubleshootingResponse } from "@/lib/ai/troubleshooting";
import {
  InvalidRequestError,
  PayloadTooLargeError,
  readJsonBody,
} from "@/lib/http";
import { assistantRequestSchema } from "@/lib/validation";
import { consumePublicRateLimit } from "@/lib/public-rate-limit";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function logAssistantFailure(stage: "rate_limit" | "groq_request", error: unknown): void {
  const metadata: Record<string, string | number> = { stage };
  if (error instanceof Error) metadata.name = error.name;
  if (typeof error === "object" && error !== null) {
    const details = error as { status?: unknown; statusCode?: unknown; code?: unknown };
    const status = details.status ?? details.statusCode;
    if (typeof status === "number" && Number.isInteger(status)) metadata.status = status;
    if (typeof details.code === "string" && /^[A-Za-z0-9_.-]{1,48}$/.test(details.code)) {
      metadata.code = details.code;
    }
  }
  console.error("[assistant] request failed", metadata);
}

export async function POST(request: Request) {
  try {
    const limit = await consumePublicRateLimit(request, "assistant", 12, 60);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "You’ve sent several requests. Wait a moment and try again." },
        { status: 429, headers: { ...NO_STORE_HEADERS, "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
  } catch (error) {
    // This first catch only handles the public rate-limit database operation.
    // Keep the log metadata-only; never record the prompt or credentials.
    logAssistantFailure("rate_limit", error);
    return NextResponse.json({ error: "The assistant is temporarily unavailable. Please try again." }, { status: 503, headers: NO_STORE_HEADERS });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, 256 * 1_024);
  } catch (error) {
    logAssistantFailure("groq_request", error);
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json(
        { error: "That conversation is too long. Start a new chat and try again." },
        { status: 413, headers: NO_STORE_HEADERS },
      );
    }
    const message = error instanceof InvalidRequestError ? error.message : "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const input = assistantRequestSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: "Enter a problem in 1–4,000 characters. Keep up to 12 recent chat messages." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const response = await generateTroubleshootingResponse(input.data);
    return NextResponse.json(response, { headers: NO_STORE_HEADERS });
  } catch (error) {
    const timedOut = error instanceof Error && error.name.toLowerCase().includes("timeout");
    return NextResponse.json(
      {
        error: timedOut
          ? "The assistant took too long to respond. Please try again."
          : "The assistant is temporarily unavailable. Please try again.",
      },
      {
        status: timedOut ? 504 : 502,
        headers: NO_STORE_HEADERS,
      },
    );
  }
}
