# HelpDesk AI Build Plan

## Requirements and technical decisions

- `features.md` is the available product requirements document. A separate `requirement.md` was not present when this plan was prepared; reconcile this plan if one is added.
- Existing app: Next.js 16.4.3 App Router, React 19.3, TypeScript, Tailwind CSS 4.
- Database: Neon Postgres using `DATABASE_URL`, accessed through Drizzle ORM and migrations.
- AI: Groq called only from server-side code using `GROQ_API_KEY` and `GROQ_MODEL="openai/gpt-oss-20b"`.
- Validation: Zod schemas shared by forms and server handlers.
- Authentication: application-managed email/password authentication. Use `jose` for JWT signing and verification, and Node's built-in async `scrypt` for password hashing. Do not implement custom cryptographic algorithms.
- Session design: short-lived signed JWT in an HttpOnly, Secure (in production), SameSite cookie; include a random session ID and check its active server-side session record on protected requests so logout/revocation takes effect. Validate signature with a fixed algorithm plus issuer, audience, expiry, and subject. Treat database user role as authoritative; do not authorize based only on a role claim in a token. Keep signing secret in a new server-only `JWT_SECRET` environment variable. No public sign-up; create the first admin through a one-time server-side bootstrap procedure.
- Public users can troubleshoot and create tickets anonymously. Ticket tracking uses a random private access token in addition to the human-readable reference; persist only a hash of that token.
- Use App Router pages for UI, Route Handlers for API boundaries, and a server-only data access layer for database queries and authorization. Keep interactive chat/forms in small Client Components and render data-driven pages as Server Components where practical.

## Routes

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Home page, issue categories, safety note, primary CTA | Public |
| `/assistant` | Guided troubleshooting and ticket escalation | Public |
| `/tickets/new` | Create a ticket manually or from a conversation | Public |
| `/tickets/[reference]` | Ticket status and details | Private tracking token required |
| `/admin/login` | Staff sign-in | Public endpoint; rate limited |
| `/admin` | Ticket metrics and queue | Admin |
| `/admin/tickets/[id]` | Ticket details, history, and updates | Admin |

## Data model

- `users`: normalized email, password hash, role (`admin` or `agent`), active flag, timestamps.
- `auth_sessions`: random session ID, user ID, expiry, revoked timestamp, created timestamp. JWT carries the session ID; the server checks this row for each protected request.
- `auth_login_attempts`: hashed email/IP buckets, rolling-window failure count, and temporary block expiry for persistent login throttling without storing raw IP/email keys.
- `tickets`: internal UUID, unique human-readable reference, unique idempotency submission key, hashed tracking token, title, description, category, priority, status, optional contact email, optional AI summary, created/updated timestamps.
- `ticket_events`: ticket ID, event type, previous/new status or priority where applicable, optional actor ID, timestamp. Use for ticket history and staff audit trail.
- Store only a bounded conversation summary with a ticket; do not persist full chat transcripts by default. Warn users not to include credentials or one-time codes and avoid logging secrets.

Use validated enums/constraints for supported categories, priorities, and statuses. Add indexes for reference, status, priority, category, creation time, session user/expiry, and common admin filters.

## Phases and completion gates

### Phase 0 — Dependencies and project baseline (complete)

- Add Drizzle ORM, Neon serverless driver, Drizzle Kit, Zod, Groq SDK, and `jose`.
- Confirm current Next.js App Router structure and existing environment variable names without exposing secret values.
- Keep `package.json` and lockfile aligned; do not include an auth framework.

**Gate:** all expected packages are installed and no Better Auth dependency remains.

### Phase 1 — Database and server foundation

1. Add server-only typed environment parsing for `DATABASE_URL`, `GROQ_API_KEY`, `GROQ_MODEL`, and `JWT_SECRET`; fail clearly on missing/invalid values without logging secret contents.
2. Configure Drizzle Kit and the Neon client.
3. Define enums, tables, indexes, relations, and generated types for users, sessions, tickets, and ticket events.
4. Generate and apply the initial migration; document safe local migration commands.
5. Add shared Zod schemas, DTOs, and server-only module boundaries for AI, authentication, tickets, and admin operations.

**Gate:** app can connect to Neon, migrations are reproducible, and server configuration validates without leaking secrets.

### Phase 2 — Raw authentication and authorization

1. Implement password hashing and verification with async `node:crypto` scrypt, random salts, and constant-time comparison.
2. Implement `/admin/login` and admin login/logout Route Handlers; no public registration or password reset flow in the initial demo.
3. Issue a signed JWT cookie with a fixed algorithm, issuer, audience, subject, session ID, and expiry. Set HttpOnly, SameSite, Path, and production Secure attributes.
4. Implement server-side session lookup/revocation and a data-access-layer `requireAdmin` guard. Re-read current user role/active state from the database for authorization.
5. Add login rate limiting, generic credential errors, origin/CSRF checks for mutations, and a one-time first-admin bootstrap command that never prints the password/hash.
6. Protect admin pages and APIs independently; use Next.js proxy only for early navigation filtering if useful, never as the only authorization check.

**Gate:** valid admin credentials can sign in; non-admin, expired, revoked, and invalid tokens cannot read or mutate admin data; logout revokes the server session.

### Phase 3 — Public shell and AI assistant

1. Build responsive home page, navigation, issue cards, and visible AI safety note.
2. Build accessible chat UI with multiline input, loading state, duplicate-submit prevention, retryable errors, readable steps, and solved/follow-up/create-ticket actions.
3. Implement `POST /api/assistant`: validate bounded input/history, call Groq server-side, parse/validate structured output, and return summary, category, clarifying question, steps, cautions, and escalation guidance.
4. Keep recent follow-up history bounded. Apply request size limits, timeout, and useful error responses.
5. Prompt safeguards: never claim device access, request secrets, suggest disabling security protections, or recommend destructive actions without safer alternatives and warnings. Recommend IT/security escalation for urgent/security reports.

**Gate:** a visitor can complete a follow-up flow and get a schema-valid answer or recover from a clear error state.

### Phase 4 — Ticket lifecycle

1. Build ticket form with title (5–120 characters), description (10–5,000 characters), category, priority, optional contact, optional conversation summary, and secret warning.
2. Support editable assistant-prefilled summary/category/priority.
3. Implement `POST /api/tickets` with server validation, idempotency key, unique human-readable reference, and initial event. Use Neon HTTP's atomic Drizzle batch to commit the ticket and initial event together. Derive a high-entropy per-ticket access token from the random submission key using a server-secret HMAC; store only its hash.
4. Set the token in a ticket-specific HttpOnly, SameSite cookie scoped to that ticket path. Do not put it in a URL or expose it to browser JavaScript. Show a confirmation and a link to the ticket.
5. Load `/tickets/[reference]` through a server-only data access function that verifies the cookie token before returning a minimal ticket DTO. Use indistinguishable not-found/unauthorized states.

**Gate:** a visitor can create a valid ticket and track it only with its private token.

### Phase 5 — Admin dashboard

1. Build admin summary cards for total, open, in-progress, and resolved tickets.
2. Implement ticket queue search, status/category/priority filters, sorting, and pagination/result limits.
3. Build ticket details with description, AI summary, timestamps, and status history.
4. Implement admin update API for status and priority; require authorization on every request, update `updated_at`, and append an actor-attributed event atomically.

**Implementation status: complete.** The protected `/admin` dashboard and `/admin/tickets/[id]` detail page use the database-backed `requireAdmin` guard. The admin APIs return no-store responses and enforce the same guard at each request boundary. Ticket updates use a single PostgreSQL statement to update the ticket and append actor-attributed status/priority history events atomically.

**Gate:** authorized staff can manage tickets; unauthenticated/non-admin calls are rejected at every admin data boundary.

### Phase 6 — Polish and release readiness

1. Complete responsive and keyboard-accessible layouts, empty/loading/error/validation states, and metadata.
2. Review rate limits, input bounds, session/token handling, password hashing, authorization, privacy, and log redaction.
3. Document required environment variable names, first-admin bootstrap, Neon migrations, and deployment steps. Never commit actual secrets.
4. Walk through the acceptance checklist below and resolve gaps.

**Implementation status: complete.** Responsive layouts and form, loading, empty, and error states were reviewed. Login throttling remains enabled; the public assistant is limited to 12 requests per minute per client and ticket creation to 10 per hour, using HMAC-protected client keys stored in Neon. The new rate-limit table migration was applied. README now covers local setup, environment variables, the one-time admin bootstrap, migrations, server deployment, stable `JWT_SECRET` handling, and the requirement for a trusted proxy to overwrite `x-forwarded-for`. TypeScript, lint, and the optimized Webpack production build pass. The first administrator still needs to be created in the target environment using the documented bootstrap procedure.

**Gate:** core user journeys work on mobile/tablet/desktop and deployment setup is documented and reproducible.

## API outline

- `POST /api/auth/login`, `POST /api/auth/logout`: credential/session lifecycle.
- `POST /api/assistant`: validated Groq troubleshooting response.
- `POST /api/tickets`: idempotent ticket creation; the private tracking page reads its path-scoped HttpOnly cookie server-side.
- `GET /api/admin/tickets`, `GET /api/admin/metrics`, `PATCH /api/admin/tickets/[id]`: admin-only queue, metrics, and updates.

Treat every Route Handler as a public boundary: validate input, limit request sizes, and perform authorization in the handler/data-access layer. Keep JWT secrets, Groq credentials, database credentials, password hashes, and tracking-token hashes server-only.

## Acceptance checklist

- Visitor can describe an issue, get structured guidance, ask follow-ups, mark resolved, or create a ticket.
- AI response includes category and relevant safety/escalation guidance and never claims device access or asks for secrets.
- A ticket validates all fields, has a unique reference, and is trackable only with its private token.
- Ticket status and priority use supported values; changes update timestamps and create history events.
- Admin metrics and queue support filters/search/pagination; every admin read and write enforces server-side authorization.
- Invalid/oversized input and provider/database/auth failures produce safe, recoverable UI states.
- Secrets, password hashes, JWTs, and tracking-token hashes are not exposed to browser code or logs.
- Core layouts work at mobile, tablet, and desktop widths and support keyboard-accessible forms/actions.
