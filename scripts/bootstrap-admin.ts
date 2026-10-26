import { eq } from "drizzle-orm";
import { config } from "dotenv";
import { users } from "@/lib/db/schema";
import { staffLoginSchema } from "@/lib/validation";

config({ path: ".env.local" });
config({ path: ".env" });

async function bootstrapAdmin(): Promise<void> {
  // Load dotenv before importing server-only modules that initialize the database.
  const [{ db }, { hashPassword }] = await Promise.all([
    import("@/lib/db"),
    import("@/lib/auth/password"),
  ]);

  const parsedCredentials = staffLoginSchema.safeParse({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });

  if (!parsedCredentials.success || parsedCredentials.data.password.length < 12) {
    throw new Error("Set a valid ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.");
  }

  const existingAdmin = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);
  if (existingAdmin.length > 0) {
    throw new Error("An administrator already exists; bootstrap is one-time only.");
  }

  const { email, password } = parsedCredentials.data;
  const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length > 0) {
    throw new Error("That email is already registered.");
  }

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ email, passwordHash, role: "admin" });
  console.info(`Administrator account created for ${email}. Remove ADMIN_EMAIL and ADMIN_PASSWORD from your local environment.`);
}

bootstrapAdmin().catch((error: unknown) => {
  if (error instanceof Error && error.message.startsWith("Set a valid")) {
    console.error(error.message);
  } else if (error instanceof Error && error.message.includes("already exists")) {
    console.error(error.message);
  } else if (error instanceof Error && error.message.includes("already registered")) {
    console.error(error.message);
  } else {
    console.error("Admin bootstrap failed. Check the database connection and retry.");
  }
  process.exitCode = 1;
});
