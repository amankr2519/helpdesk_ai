import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminHeader from "@/app/admin/admin-header";
import { AuthorizationError, requireAdmin } from "@/lib/auth/dal";
import { getTicketMetrics, getTicketQueue } from "@/lib/admin/tickets";
import { adminTicketFiltersSchema } from "@/lib/validation";
import { ticketCategories, ticketPriorities, ticketStatuses } from "@/lib/domain";

export const metadata: Metadata = { title: "Ticket dashboard | HelpDesk AI", robots: { index: false, follow: false } };

const statusLabels: Record<string, string> = { open: "Open", in_progress: "In progress", waiting_on_user: "Waiting on you", resolved: "Resolved", closed: "Closed" };
const categoryLabels: Record<string, string> = { network_connectivity: "Network & connectivity", software_applications: "Software & applications", hardware_devices: "Hardware & devices", account_access: "Account & access", performance: "Performance", security_concern: "Security concern", other: "Other" };
const priorityLabels: Record<string, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function AdminLoading() {
  return <div aria-label="Loading dashboard" className="animate-pulse space-y-6"><div className="h-9 w-64 rounded bg-slate-200" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <div className="h-28 rounded-2xl bg-slate-200" key={item} />)}</div><div className="h-80 rounded-2xl bg-slate-200" /></div>;
}

async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  let staff;
  try {
    staff = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) redirect("/admin/login");
    throw error;
  }

  const rawParams = await searchParams;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (firstValue !== undefined) params[key] = firstValue;
  }
  const parsedFilters = adminTicketFiltersSchema.safeParse(params);
  if (!parsedFilters.success) redirect("/admin");
  const filters = parsedFilters.data;
  const [metrics, queue] = await Promise.all([getTicketMetrics(), getTicketQueue(filters)]);
  const pageCount = Math.max(1, Math.ceil(queue.total / queue.pageSize));
  const withPage = (page: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value && key !== "page") next.set(key, value);
    next.set("page", String(page));
    return `/admin?${next.toString()}`;
  };

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-700">Staff dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Ticket queue</h1>
          </div>
          <p className="text-sm text-slate-600">Signed in as <span className="font-medium text-slate-800">{staff.email}</span></p>
        </div>

        <section aria-label="Ticket metrics" className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total tickets", metrics.total, "All tickets"],
            ["Open", metrics.open, "Needs review"],
            ["In progress", metrics.inProgress, "Being worked on"],
            ["Resolved", metrics.resolved, "Completed"],
          ].map(([label, value, hint]) => (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={label}>
              <p className="text-sm font-medium text-slate-600">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{hint}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">All tickets</h2>
                <p className="mt-1 text-sm text-slate-600">Search, filter, and open a ticket to review its history.</p>
              </div>
              <p className="text-sm text-slate-500">{queue.total} result{queue.total === 1 ? "" : "s"}</p>
            </div>
            <form action="/admin" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <label className="lg:col-span-2"><span className="sr-only">Search tickets</span><input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" defaultValue={filters.query} maxLength={120} name="query" placeholder="Search title, reference, email" type="search" /></label>
              <label><span className="sr-only">Filter by status</span><select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" defaultValue={filters.status ?? ""} name="status"><option value="">All statuses</option>{ticketStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
              <label><span className="sr-only">Filter by category</span><select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" defaultValue={filters.category ?? ""} name="category"><option value="">All categories</option>{ticketCategories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label>
              <label><span className="sr-only">Filter by priority</span><select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" defaultValue={filters.priority ?? ""} name="priority"><option value="">All priorities</option>{ticketPriorities.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}</select></label>
              <label><span className="sr-only">Sort tickets by</span><select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" defaultValue={filters.sortBy} name="sortBy"><option value="createdAt">Created date</option><option value="updatedAt">Updated date</option><option value="priority">Priority</option></select></label>
              <label><span className="sr-only">Sort direction</span><select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" defaultValue={filters.sortDirection} name="sortDirection"><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
              <input name="pageSize" type="hidden" value={filters.pageSize} />
              <div className="flex gap-2 sm:col-span-2 lg:col-span-2"><button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" type="submit">Apply filters</button><Link className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/admin">Clear</Link></div>
            </form>
          </div>

          {queue.tickets.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold sm:px-6">Ticket</th><th className="px-4 py-3 font-semibold">Category</th><th className="px-4 py-3 font-semibold">Priority</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Updated</th><th className="px-5 py-3 sm:px-6"><span className="sr-only">Open ticket</span></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {queue.tickets.map((ticket) => <tr className="hover:bg-slate-50/70" key={ticket.id}>
                    <td className="px-5 py-4 sm:px-6"><Link className="font-semibold text-slate-900 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700" href={`/admin/tickets/${ticket.id}`}>{ticket.title}</Link><p className="mt-1 font-mono text-xs text-slate-500">{ticket.reference} · created {formatDate(ticket.createdAt)}</p></td>
                    <td className="px-4 py-4 text-slate-600">{categoryLabels[ticket.category]}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{priorityLabels[ticket.priority]}</span></td>
                    <td className="px-4 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">{statusLabels[ticket.status]}</span></td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-600">{formatDate(ticket.updatedAt)}</td>
                    <td className="px-5 py-4 text-right sm:px-6"><Link aria-label={`View ${ticket.reference}`} className="font-semibold text-blue-700 hover:text-blue-900" href={`/admin/tickets/${ticket.id}`}>View</Link></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-14 text-center sm:px-8"><span aria-hidden="true" className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-lg text-slate-500">⌕</span><h3 className="mt-4 font-semibold text-slate-900">No tickets found</h3><p className="mt-1 text-sm text-slate-600">Try changing or clearing your filters.</p></div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
            <p className="text-xs text-slate-500">Page {filters.page} of {pageCount}</p>
            <div className="flex gap-2"><Link aria-disabled={filters.page <= 1} className={`rounded-lg border px-3 py-2 text-sm font-medium ${filters.page <= 1 ? "pointer-events-none border-slate-200 text-slate-400" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`} href={withPage(Math.max(1, filters.page - 1))}>Previous</Link><Link aria-disabled={filters.page >= pageCount} className={`rounded-lg border px-3 py-2 text-sm font-medium ${filters.page >= pageCount ? "pointer-events-none border-slate-200 text-slate-400" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`} href={withPage(Math.min(pageCount, filters.page + 1))}>Next</Link></div>
          </div>
        </section>
      </main>
    </>
  );
}

export default function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Suspense fallback={<><AdminHeader /><main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8"><AdminLoading /></main></>}><Dashboard searchParams={searchParams} /></Suspense>;
}
