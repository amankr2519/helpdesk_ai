import "server-only";

import Groq from "groq-sdk";
import { getGroqEnvironment } from "@/lib/env";

let client: Groq | undefined;

export function getGroqClient(): Groq {
  if (!client) {
    const env = getGroqEnvironment();
    client = new Groq({
      apiKey: env.GROQ_API_KEY,
      timeout: 25_000,
      maxRetries: 0,
    });
  }

  return client;
}
