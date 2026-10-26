# HelpDesk AI --- Product Features & Requirements

## 1. Project Overview

**HelpDesk AI** is an AI-assisted technical support web application.
Users describe common technology problems in natural language and
receive structured troubleshooting guidance. If the issue is not
resolved, they can create and track a support ticket. Support staff can
review and manage tickets through an admin dashboard.

### Goals

-   Reduce repetitive first-line IT support work.
-   Make technical troubleshooting accessible to non-technical users.
-   Use AI meaningfully for issue classification, guided
    troubleshooting, and ticket summaries.
-   Demonstrate a complete, polished web application suitable for a
    project assessment.

### Target users

-   **End users:** People who need help with everyday computer,
    software, account, or network issues.
-   **Support agents/admins:** People who review tickets and update
    their status.

### Technology stack

-   **Framework:** Next.js using the App Router and TypeScript.
-   **Styling:** Tailwind CSS.
-   **AI inference:** Groq API, called only from server-side code.
-   **Database:** Neon Serverless Postgres.
-   **Database access:** Drizzle ORM (recommended) or another consistent
    typed PostgreSQL layer.
-   **Validation:** Zod for validating forms, API inputs, and AI output.
-   **Authentication:** Optional for the first demo; if implemented, use
    a maintained authentication library and secure server-side session
    handling.
-   **Deployment:** A Next.js-compatible host such as Vercel, with Neon
    for Postgres.


## 2. Core User Journeys

### Journey A: Troubleshoot a problem

1.  User opens the homepage or AI Assistant page.
2.  User enters a technical problem in plain language.
3.  The server validates the request and sends a bounded prompt to Groq.
4.  AI returns a structured response: issue summary, category,
    clarifying question if needed, safe troubleshooting steps, and
    escalation recommendation.
5.  User can ask follow-up questions.
6.  User marks the problem as resolved or chooses **Create support
    ticket**.

### Journey B: Create and track a ticket

1.  User opens the ticket form or converts a troubleshooting
    conversation into a ticket.
2.  User enters a title, description, category, and optional contact
    information.
3.  AI may suggest a concise summary, category, and priority; the user
    can review/edit these values.
4.  The server validates and stores the ticket in Neon.
5.  The app displays a confirmation and ticket reference.
6.  User can view the ticket and its current status.

### Journey C: Manage tickets as support staff

1.  Authorized admin opens the dashboard.
2.  Dashboard shows ticket counts by status and priority.
3.  Admin filters and opens a ticket.
4.  Admin reviews the description, AI summary, category, priority, and
    conversation history if available.
5.  Admin changes status or priority and saves.
6.  The application records the updated timestamp and displays the
    latest state.

## 3. Functional Requirements

### 3.1 Homepage

-   Clear value proposition and primary **Describe a problem** call to
    action.
-   Quick links to AI Assistant and My Tickets.
-   Common issue cards such as Network, Software, Hardware, and Account
    Access.
-   Brief explanation that AI suggestions can be imperfect and users
    should verify important changes.
-   Responsive layout for mobile, tablet, and desktop.

### 3.2 AI troubleshooting assistant

-   Chat-like interface with user and assistant messages.
-   Input supports multiline text and Enter/submit behavior that remains
    accessible.
-   Disable duplicate submission while a response is loading.
-   Show a loading indicator and useful error/retry message.
-   Support follow-up questions using a bounded conversation history.
-   Display answers in readable, numbered steps.
-   Offer actions: **This solved my issue**, **Ask a follow-up**, and
    **Create a ticket**.
-   AI response should include:
    -   Short issue summary.
    -   Suggested category.
    -   Clarifying question when essential context is missing.
    -   Numbered troubleshooting steps.
    -   A caution or backup recommendation for potentially disruptive
        actions.
    -   Escalation recommendation when the issue remains unresolved or
        confidence is low.
-   AI must not claim that it has accessed, scanned, or repaired the
    user's device.
-   AI must not request passwords, one-time codes, private keys, or
    other secrets.
-   Do not instruct users to disable security protections, run unknown
    scripts, or make destructive system changes without appropriate
    warnings and safer alternatives.
-   Include a visible note that generated advice may be inaccurate.

### 3.3 Issue classification

-   Supported initial categories:
    -   Network & Connectivity
    -   Software & Applications
    -   Hardware & Devices
    -   Account & Access
    -   Performance
    -   Security Concern
    -   Other
-   Priority levels: Low, Medium, High, Urgent.
-   AI provides a suggested category and priority; server-side
    validation restricts values to supported enums.
-   AI suggestions must be editable by the user or authorized support
    staff.
-   Urgent/security-related reports should recommend contacting the
    appropriate IT/security team rather than relying solely on chatbot
    advice.

### 3.4 Ticket creation

-   Fields:
    -   Title (required, 5--120 characters).
    -   Description (required, 10--5,000 characters).
    -   Category (required).
    -   Priority (defaults to AI suggestion or Medium).
    -   Optional email/contact field, only if needed.
    -   Optional related conversation summary.
-   Validate on both client and server.
-   Show field-level validation errors.
-   Create a unique, human-readable ticket reference.
-   Prevent accidental duplicate submissions.
-   Show a success page/toast with a link to the ticket.
-   Never store passwords, authentication tokens, or other secrets in
    ticket descriptions intentionally; warn users not to include them.

### 3.5 Ticket list and details

-   List tickets with reference, title, category, priority, status, and
    created date.
-   Filter by status, category, and priority.
-   Search by ticket reference or title.
-   Detail page shows description, AI summary if available, timestamps,
    and status history where implemented.
-   Status values: Open, In Progress, Waiting on User, Resolved, Closed.
-   Empty states explain how to create a ticket.
-   Add pagination or a reasonable result limit as data grows.

### 3.6 Admin dashboard

-   Protected route; only authorized admins may access it.
-   Summary cards: Total, Open, In Progress, Resolved.
-   Optional charts for tickets by category and priority.
-   Table/list of tickets with search, filters, sorting, and pagination.
-   Ticket detail view with description, AI summary, suggested
    category/priority, and timestamps.
-   Admin can update status and priority.
-   Server must verify authorization for every admin data read or
    mutation; hiding UI controls alone is not security.
-   Record `updated_at` on changes. If audit history is implemented,
    record actor, old value, new value, and timestamp.





