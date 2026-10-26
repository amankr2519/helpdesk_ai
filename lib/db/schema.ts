import {
  boolean,
  integer,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  ticketCategories,
  ticketPriorities,
  ticketStatuses,
} from "@/lib/domain";

export const userRoleEnum = pgEnum("user_role", ["admin", "agent"]);
export const ticketCategoryEnum = pgEnum("ticket_category", [...ticketCategories]);
export const ticketPriorityEnum = pgEnum("ticket_priority", [...ticketPriorities]);
export const ticketStatusEnum = pgEnum("ticket_status", [...ticketStatuses]);
export const ticketEventTypeEnum = pgEnum("ticket_event_type", [
  "created",
  "status_changed",
  "priority_changed",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("agent"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("auth_sessions_user_id_idx").on(table.userId),
    index("auth_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const authLoginAttempts = pgTable(
  "auth_login_attempts",
  {
    keyHash: varchar("key_hash", { length: 64 }).primaryKey(),
    attemptCount: integer("attempt_count").notNull().default(0),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  },
  (table) => [index("auth_login_attempts_blocked_until_idx").on(table.blockedUntil)],
);

export const publicRequestRateLimits = pgTable(
  "public_request_rate_limits",
  {
    keyHash: varchar("key_hash", { length: 64 }).primaryKey(),
    requestCount: integer("request_count").notNull().default(0),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("public_request_rate_limits_window_started_at_idx").on(table.windowStartedAt)],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reference: varchar("reference", { length: 24 }).notNull(),
    submissionKey: uuid("submission_key").notNull().defaultRandom(),
    trackingTokenHash: text("tracking_token_hash").notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull(),
    category: ticketCategoryEnum("category").notNull(),
    priority: ticketPriorityEnum("priority").notNull().default("medium"),
    status: ticketStatusEnum("status").notNull().default("open"),
    contactEmail: varchar("contact_email", { length: 320 }),
    aiSummary: text("ai_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tickets_reference_unique").on(table.reference),
    uniqueIndex("tickets_submission_key_unique").on(table.submissionKey),
    index("tickets_status_idx").on(table.status),
    index("tickets_priority_idx").on(table.priority),
    index("tickets_category_idx").on(table.category),
    index("tickets_created_at_idx").on(table.createdAt),
  ],
);

export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    eventType: ticketEventTypeEnum("event_type").notNull(),
    fromStatus: ticketStatusEnum("from_status"),
    toStatus: ticketStatusEnum("to_status"),
    fromPriority: ticketPriorityEnum("from_priority"),
    toPriority: ticketPriorityEnum("to_priority"),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ticket_events_ticket_id_idx").on(table.ticketId),
    index("ticket_events_actor_user_id_idx").on(table.actorUserId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(authSessions),
  ticketEvents: many(ticketEvents),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));

export const ticketsRelations = relations(tickets, ({ many }) => ({
  events: many(ticketEvents),
}));

export const ticketEventsRelations = relations(ticketEvents, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketEvents.ticketId], references: [tickets.id] }),
  actor: one(users, { fields: [ticketEvents.actorUserId], references: [users.id] }),
}));
