# HelpDesk AI Progress Checklist

This tracks the phase gates in [plan.md](plan.md). Update it as each task is completed.

## Phase 0 — Dependencies and project baseline

- [x] Confirm existing stack: Next.js 16.4.3, React 19.3, TypeScript, App Router, Tailwind CSS 4.
- [x] Install Drizzle ORM, Neon serverless driver, Drizzle Kit, Zod, Groq SDK, and `jose`.
- [x] Remove Better Auth and the accidental `uninstall` dependency from package metadata/lockfile.
- [x] Keep Groq and database credentials server-side; do not inspect or expose `.env` values.

## Phase 1 — Database and server foundation

- [x] Add typed server-only environment validation for database, Groq, model, and JWT secret.
- [x] Configure Drizzle Kit and Neon database client.
- [x] Define user, auth session, ticket, and ticket event schemas, indexes, and relations.
- [x] Generate and apply initial database migration.
- [x] Add shared Zod schemas, DTOs, and server-only module boundaries.
- [x] Document environment variable names and migration commands in README.

## Phase 2 — Raw authentication and authorization

- [x] Implement async scrypt password hash/verify helpers with random salts and constant-time comparison.
- [x] Add `/admin/login` plus login/logout Route Handlers; keep public registration disabled.
- [x] Issue and verify a signed JWT cookie with fixed algorithm, issuer, audience, subject, session ID, and expiry.
- [x] Set HttpOnly, SameSite, Path, and production Secure cookie attributes.
- [x] Add server-side session verification/revocation and database-backed `requireAdmin` authorization.
- [x] Add persistent login throttling, generic credential errors, same-origin mutation checks, and a one-time first-admin bootstrap command.
- [x] Implement checks that reject expired, revoked, malformed, inactive, and non-admin sessions from admin data access.
- [x] Add and apply the login-throttling table migration.
- [x] Generate a local `JWT_SECRET` in ignored `.env.local` without printing it.

### Local activation before first staff sign-in

- [x] Set temporary `ADMIN_EMAIL` and `ADMIN_PASSWORD` privately, run `npm run auth:bootstrap-admin`, and remove the temporary values afterward.

## Phase 3 — Public shell and AI assistant

- [x] Build responsive home page, navigation, issue cards, and safety note.
- [x] Build accessible chat UI with loading, retry, follow-up, solved, and create-ticket handoff states.
- [x] Implement bounded, server-only Groq assistant endpoint with validated structured output.
- [x] Add safe prompt rules, request bounds, timeout, and useful error handling.

## Phase 4 — Ticket lifecycle

- [x] Build validated ticket form with assistant prefill and editable suggestions.
- [x] Create tickets with unique reference, HMAC-derived private token/hash, and initial event in an atomic Neon batch.
- [x] Add success confirmation and ticket status page protected by a ticket-specific HttpOnly cookie.
- [x] Add submission idempotency, secret warning, and privacy-safe errors.
- [x] Keep private tracking credentials out of URLs and browser JavaScript.
- [x] Apply the submission idempotency migration to Neon.

## Phase 5 — Admin dashboard

- [x] Build admin-only ticket summary metrics for total, open, in-progress, and resolved tickets.
- [x] Build searchable, filterable, sortable, paginated ticket queue with bounded page sizes.
- [x] Build protected ticket details with description, AI summary, timestamps, contact information, and event history.
- [x] Implement admin-authorized status/priority updates with same-origin checks and actor-attributed audit events written atomically with each update.
- [x] Protect dashboard pages and every admin API read/write with database-backed `requireAdmin` authorization.

## Phase 6 — Polish and release readiness

- [x] Review responsive layouts, keyboard labels/focus states, loading, empty, validation, and error states across the user and staff flows.
- [x] Review input bounds, scrypt password handling, JWT/session validation and revocation, authorization on each admin boundary, cookie privacy, and log redaction.
- [x] Add database-backed request limits for the Groq assistant (12/minute per client) and ticket creation (10/hour per client); retain login throttling.
- [x] Add and apply the Neon migration for public request rate limits.
- [x] Document environment variables, first-admin bootstrap, Neon migrations, deployment, stable JWT secret requirements, and trusted proxy configuration in README.
- [x] Review the acceptance checklist in `plan.md` against the implementation.
- [x] Confirm `npx tsc --noEmit`, `npm run lint`, and the production Webpack build pass.
