# HelpDesk AI

An AI-assisted support app built with Next.js App Router, Neon Postgres, Drizzle ORM, and Groq. Visitors can get troubleshooting help, submit private tickets, and staff can manage tickets through a protected dashboard.

## Local development

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Set these variables in `.env` or another ignored local environment file. `.env.example` lists the variable names with placeholders; do not commit real credentials.

- `DATABASE_URL` — Neon Postgres connection string.
- `GROQ_API_KEY` — server-side Groq API key.
- `GROQ_MODEL` — model name; defaults to `openai/gpt-oss-20b`.
- `JWT_SECRET` — at least 32 characters of random secret material for staff JWT signing and ticket tracking credentials.

The credentials must stay server-side; do not prefix them with `NEXT_PUBLIC_`.

## Database

Drizzle Kit reads `DATABASE_URL` from the local environment:

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

After changing `lib/db/schema.ts`, generate a migration, review its SQL in `drizzle/`, then apply it with `db:migrate`.

## Staff authentication

Public account registration is disabled. Add a `JWT_SECRET` locally with at least 32 random characters (for example, generate one with `openssl rand -base64 48`).

For the first admin only, temporarily set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in an ignored local environment file. The password must be at least 12 characters. Run:

```bash
npm run auth:bootstrap-admin
```

The command refuses to create another admin once one exists. Remove the temporary bootstrap values after it succeeds. Admin sign-in is at `/admin/login`; sessions use an HttpOnly cookie and are revoked on sign-out.

## Deployment

Deploy as a Node.js Next.js application on Vercel or another host that supports server rendering and Route Handlers. Static export is not supported because authentication, ticket tracking, APIs, and database access need a server.

Before the first deployment:

1. Add `DATABASE_URL`, `GROQ_API_KEY`, `GROQ_MODEL` (optional), and a unique `JWT_SECRET` to the host's server-side environment for build and runtime. Never put credentials in `NEXT_PUBLIC_` variables.
2. Create the Neon database and apply migrations with `npm run db:migrate`. Run migrations as a deployment step or once before switching the app to the new version.
3. Bootstrap the first admin from a trusted machine using the local steps above. Never put the bootstrap password in deployment settings.
4. Configure the trusted reverse proxy to replace incoming `x-forwarded-for` values. The login and public API limits use this header for client identification; a directly exposed server must not trust a client-supplied forwarding header.
5. Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` before release, then use `npm run start` or the platform's equivalent.

Keep `JWT_SECRET` stable across instances so staff sessions and private ticket tracking credentials continue to verify. Rotate it only with a planned invalidation of existing sessions and tracking access.

## Operational notes

- Login attempts, assistant requests, and ticket submissions are rate-limited in Neon. Limiter keys are HMAC-protected; expired public request windows are cleaned up opportunistically.
- Ticket tracking access is stored in a ticket-specific HttpOnly cookie. Customers need the same browser profile used to submit the ticket to open its private tracking page.
- Staff dashboard pages and APIs re-check the active database session and role for each request.
- Do not include user secrets in tickets, logs, screenshots, or example environment files.
