import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import { getTicketAccessCookie } from "@/lib/tickets/cookie";
import { getTrackedTicket } from "@/lib/tickets/access";
import { ticketReferenceSchema } from "@/lib/validation";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/domain";

export const metadata: Metadata = {
  title: "Ticket status",
  description: "View the current status of your support ticket.",
  referrer: "no-referrer",
};

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_on_user: "Waiting on You",
  resolved: "Resolved",
  closed: "Closed",
};

const categoryLabels: Record<TicketCategory, string> = {
  network_connectivity: "Network & Connectivity",
  software_applications: "Software & Applications",
  hardware_devices: "Hardware & Devices",
  account_access: "Account & Access",
  performance: "Performance",
  security_concern: "Security Concern",
  other: "Other",
};

const priorityLabels: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function TicketLoading() {
  return (
    <section aria-label="Loading ticket" className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="h-4 w-28 rounded bg-slate-200" />
      <div className="mt-4 h-8 max-w-xl rounded bg-slate-200" />
      <div className="mt-8 h-24 rounded-2xl bg-slate-100" />
    </section>
  );
}

function UnavailableTicket({ reference }: { reference: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <span aria-hidden="true" className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-600">?</span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Ticket unavailable</h1>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
        We couldn’t show ticket {reference}. Open the tracking page in the same browser where you submitted it. For privacy, this page gives the same message if the ticket or its private access is unavailable.
      </p>
      <Link className="mt-6 inline-flex rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800" href="/tickets/new">Create a new ticket</Link>
    </section>
  );
}

async function TicketContent({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!ticketReferenceSchema.safeParse(reference).success) notFound();

  const token = await getTicketAccessCookie(reference);
  const ticket = await getTrackedTicket(reference, token);
  if (!ticket) return <UnavailableTicket reference={reference} />;

  const priorityTone = ticket.priority === "urgent" || ticket.priority === "high"
    ? "bg-rose-50 text-rose-700"
    : ticket.priority === "low"
      ? "bg-slate-100 text-slate-700"
      : "bg-amber-50 text-amber-800";

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs font-semibold tracking-wide text-slate-500">{ticket.reference}</p>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
            <span className="size-1.5 rounded-full bg-blue-600" /> {statusLabels[ticket.status]}
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{ticket.title}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">{categoryLabels[ticket.category]}</span>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${priorityTone}`}>{priorityLabels[ticket.priority]} priority</span>
        </div>
      </div>

      <div className="grid gap-8 px-5 py-6 sm:px-8 sm:py-8 md:grid-cols-[1fr_250px]">
        <div className="space-y-7">
          {ticket.aiSummary ? (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wide text-blue-800">Troubleshooting summary</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{ticket.aiSummary}</p>
            </section>
          ) : null}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Issue description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{ticket.description}</p>
          </section>
        </div>

        <aside className="h-fit rounded-2xl bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Ticket activity</h2>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Created</dt>
              <dd className="mt-1 text-xs text-slate-700">{formatDate(ticket.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last updated</dt>
              <dd className="mt-1 text-xs text-slate-700">{formatDate(ticket.updatedAt)}</dd>
            </div>
          </dl>
          <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">This page is protected by private access stored in this browser. Save the page link to return here later on this device.</p>
        </aside>
      </div>
    </article>
  );
}

export default function TicketPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-9 sm:px-8 sm:py-14">
        <div className="mb-6">
          <p className="text-sm font-semibold text-blue-700">Ticket tracking</p>
          <p className="mt-1 text-sm text-slate-600">Current status and the details you submitted.</p>
        </div>
        <Suspense fallback={<TicketLoading />}>
          <TicketContent params={params} />
        </Suspense>
      </main>
    </>
  );
}
