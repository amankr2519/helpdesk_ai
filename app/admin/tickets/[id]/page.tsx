import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AdminHeader from "@/app/admin/admin-header";
import AdminTicketControls from "@/components/admin-ticket-controls";
import { AuthorizationError, requireAdmin } from "@/lib/auth/dal";
import { getAdminTicket } from "@/lib/admin/tickets";
import { z } from "zod";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/domain";

export const metadata: Metadata = { title: "Ticket details | HelpDesk AI", robots: { index: false, follow: false } };

const statusLabels: Record<TicketStatus, string> = { open: "Open", in_progress: "In progress", waiting_on_user: "Waiting on you", resolved: "Resolved", closed: "Closed" };
const categoryLabels: Record<TicketCategory, string> = { network_connectivity: "Network & connectivity", software_applications: "Software & applications", hardware_devices: "Hardware & devices", account_access: "Account & access", performance: "Performance", security_concern: "Security concern", other: "Other" };
const priorityLabels: Record<TicketPriority, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

function formatDate(value: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

function TicketDetailLoading() {
  return <div aria-label="Loading ticket details" className="animate-pulse space-y-5"><div className="h-8 w-80 rounded bg-slate-200" /><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="h-96 rounded-2xl bg-slate-200" /><div className="h-72 rounded-2xl bg-slate-200" /></div></div>;
}

async function TicketContent({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/admin/login");
    throw error;
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ticket = await getAdminTicket(id);
  if (!ticket) notFound();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <Link className="text-sm font-medium text-blue-700 hover:text-blue-900" href="/admin">← Back to ticket queue</Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div><p className="font-mono text-xs font-semibold tracking-wide text-slate-500">{ticket.reference}</p><h1 className="mt-2 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{ticket.title}</h1><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">{categoryLabels[ticket.category]}</span><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800">{statusLabels[ticket.status]}</span><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">{priorityLabels[ticket.priority]} priority</span></div></div>
          <p className="text-sm text-slate-500">Updated {formatDate(ticket.updatedAt)}</p>
        </div>

        <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Issue description</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">{ticket.description}</p></section>
            {ticket.aiSummary ? <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6"><h2 className="text-sm font-semibold uppercase tracking-wide text-blue-800">Troubleshooting summary</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{ticket.aiSummary}</p></section> : null}
            <section aria-labelledby="history-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold text-slate-950" id="history-heading">Ticket history</h2><ol className="mt-5 space-y-5">
              {ticket.events.map((event, index) => {
                let description = "Ticket created";
                if (event.eventType === "status_changed") description = `Status changed from ${event.fromStatus ? statusLabels[event.fromStatus] : "—"} to ${event.toStatus ? statusLabels[event.toStatus] : "—"}`;
                if (event.eventType === "priority_changed") description = `Priority changed from ${event.fromPriority ? priorityLabels[event.fromPriority] : "—"} to ${event.toPriority ? priorityLabels[event.toPriority] : "—"}`;
                return <li className="relative flex gap-3" key={`${event.createdAt}-${index}`}><span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-600 ring-4 ring-blue-50" /><div><p className="text-sm font-medium text-slate-900">{description}</p><p className="mt-1 text-xs text-slate-500">{formatDate(event.createdAt)}{event.actorName ? ` · ${event.actorName}` : " · Customer"}</p></div></li>;
              })}
              {!ticket.events.length ? <li className="text-sm text-slate-500">No activity recorded yet.</li> : null}
            </ol></section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <AdminTicketControls id={ticket.id} priority={ticket.priority} status={ticket.status} />
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Ticket information</h2><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</dt><dd className="mt-1 text-slate-800">{formatDate(ticket.createdAt)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact email</dt><dd className="mt-1 break-all text-slate-800">{ticket.contactEmail ?? "Not provided"}</dd></div></dl></section>
          </aside>
        </div>
      </main>
    </>
  );
}

export default function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<><AdminHeader /><main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8"><TicketDetailLoading /></main></>}><TicketContent params={params} /></Suspense>;
}
