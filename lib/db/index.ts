import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl } from "@/lib/env";
import * as schema from "@/lib/db/schema";

const client = neon(getDatabaseUrl());

export const db = drizzle({ client, schema });
