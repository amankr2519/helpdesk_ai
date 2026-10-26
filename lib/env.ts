import "server-only";

import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

const jwtEnvironmentSchema = z.object({
  JWT_SECRET: z.string().min(32),
});

const groqEnvironmentSchema = z.object({
  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().min(1).default("openai/gpt-oss-20b"),
});

const appEnvironmentSchema = databaseEnvironmentSchema.merge(groqEnvironmentSchema).extend({
  JWT_SECRET: z.string().min(32),
});

function parseEnvironment<T extends z.ZodType>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path[0]))]
      .filter((name): name is string => typeof name === "string")
      .join(", ");
    throw new Error(`Invalid server environment configuration: ${names}`);
  }

  return result.data;
}

export function getDatabaseUrl(): string {
  return parseEnvironment(databaseEnvironmentSchema).DATABASE_URL;
}

export function getJwtSecret(): string {
  return parseEnvironment(jwtEnvironmentSchema).JWT_SECRET;
}

export function getGroqEnvironment() {
  return parseEnvironment(groqEnvironmentSchema);
}

export function getAppEnvironment() {
  return parseEnvironment(appEnvironmentSchema);
}
