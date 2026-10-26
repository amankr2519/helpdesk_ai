import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ticketEvents, tickets, users } from "@/lib/db/schema";
import type { AdminTicketFilters, AdminTicketUpdate } from "@/lib/validation";
import type { AdminTicketDTO, TicketStatus } from "@/lib/domain";

export async function getTicketMetrics() {
  const rows = await db
    .select({ status: tickets.status, count: count() })
    .from(tickets)
    .groupBy(tickets.status);
  const byStatus = new Map<TicketStatus, number>(
    rows.map((row) => [row.status, Number(row.count)]),
  );

  return {
    total: rows.reduce((sum, row) => sum + Number(row.count), 0),
    open: byStatus.get("open") ?? 0,
    inProgress: byStatus.get("in_progress") ?? 0,
    resolved: byStatus.get("resolved") ?? 0,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function getTicketQueue(filters: AdminTicketFilters) {
  const conditions = [];
  if (filters.status) conditions.push(eq(tickets.status, filters.status));
  if (filters.category) conditions.push(eq(tickets.category, filters.category));
  if (filters.priority) conditions.push(eq(tickets.priority, filters.priority));
  if (filters.query) {
    const search = `%${escapeLike(filters.query)}%`;
    conditions.push(or(
      ilike(tickets.title, search),
      ilike(tickets.reference, search),
      ilike(tickets.contactEmail, search),
    )!);
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const [totalResult] = await db.select({ total: count() }).from(tickets).where(where);
  const sortColumn = filters.sortBy === "updatedAt"
    ? tickets.updatedAt
    : filters.sortBy === "priority"
      ? tickets.priority
      : tickets.createdAt;
  const sortOrder = filters.sortDirection === "asc" ? asc : desc;
  const rows = await db
    .select({
      id: tickets.id,
      reference: tickets.reference,
      title: tickets.title,
      category: tickets.category,
      priority: tickets.priority,
      status: tickets.status,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .where(where)
    .orderBy(sortOrder(sortColumn), desc(tickets.createdAt), asc(tickets.id))
    .limit(filters.pageSize)
    .offset((filters.page - 1) * filters.pageSize);

  return {
    tickets: rows.map((ticket) => ({
      ...ticket,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    })),
    total: Number(totalResult?.total ?? 0),
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getAdminTicket(id: string): Promise<AdminTicketDTO | null> {
  const [ticket] = await db
    .select({
      id: tickets.id,
      reference: tickets.reference,
      title: tickets.title,
      description: tickets.description,
      category: tickets.category,
      priority: tickets.priority,
      status: tickets.status,
      contactEmail: tickets.contactEmail,
      aiSummary: tickets.aiSummary,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1);

  if (!ticket) return null;

  const events = await db
    .select({
      eventType: ticketEvents.eventType,
      fromStatus: ticketEvents.fromStatus,
      toStatus: ticketEvents.toStatus,
      fromPriority: ticketEvents.fromPriority,
      toPriority: ticketEvents.toPriority,
      actorName: users.email,
      createdAt: ticketEvents.createdAt,
    })
    .from(ticketEvents)
    .leftJoin(users, eq(ticketEvents.actorUserId, users.id))
    .where(eq(ticketEvents.ticketId, id))
    .orderBy(asc(ticketEvents.createdAt), asc(ticketEvents.id));

  return {
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    events: events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function updateAdminTicket(
  id: string,
  actorUserId: string,
  update: AdminTicketUpdate,
): Promise<boolean> {
  const [existing] = await db.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!existing) return false;

  // One PostgreSQL statement keeps the ticket update and its audit events atomic.
  await db.execute(sql`
    WITH current_ticket AS MATERIALIZED (
      SELECT id, status, priority
      FROM tickets
      WHERE id = ${id}::uuid
      FOR UPDATE
    ),
    updated_ticket AS (
      UPDATE tickets AS t
      SET
        status = COALESCE(${update.status ?? null}::ticket_status, t.status),
        priority = COALESCE(${update.priority ?? null}::ticket_priority, t.priority),
        updated_at = now()
      FROM current_ticket AS old
      WHERE t.id = old.id
      RETURNING t.id, t.status, t.priority
    ),
    inserted_events AS (
      INSERT INTO ticket_events (
        ticket_id, event_type, from_status, to_status,
        from_priority, to_priority, actor_user_id
      )
      SELECT changed.id, 'status_changed'::ticket_event_type,
        old.status, changed.status, NULL, NULL, ${actorUserId}::uuid
      FROM updated_ticket AS changed
      JOIN current_ticket AS old ON old.id = changed.id
      WHERE old.status IS DISTINCT FROM changed.status
      UNION ALL
      SELECT changed.id, 'priority_changed'::ticket_event_type,
        NULL, NULL, old.priority, changed.priority, ${actorUserId}::uuid
      FROM updated_ticket AS changed
      JOIN current_ticket AS old ON old.id = changed.id
      WHERE old.priority IS DISTINCT FROM changed.priority
      RETURNING id
    )
    SELECT id FROM updated_ticket
  `);

  return true;
}

