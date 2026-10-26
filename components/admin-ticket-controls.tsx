"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TicketPriority, TicketStatus } from "@/lib/domain";

const statusOptions: Array<[TicketStatus, string]> = [
  ["open", "Open"],
  ["in_progress", "In progress"],
  ["waiting_on_user", "Waiting on you"],
  ["resolved", "Resolved"],
  ["closed", "Closed"],
];
const priorityOptions: Array<[TicketPriority, string]> = [["low", "Low"], ["medium", "Medium"], ["high", "High"], ["urgent", "Urgent"]];

export default function AdminTicketControls({ id, status, priority }: { id: string; status: TicketStatus; priority: TicketPriority }) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(status);
  const [nextPriority, setNextPriority] = useState(priority);
  const [pending, setPending] = useState<"status" | "priority" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(field: "status" | "priority") {
    setPending(field);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(field === "status" ? { status: nextStatus } : { priority: nextPriority }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update the ticket.");
      setMessage("Ticket updated and history saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the ticket. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="ticket-controls-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-950" id="ticket-controls-title">Update ticket</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Changes are recorded in the ticket history with your staff account.</p>
      <div className="mt-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium text-slate-700">Status<select className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900" onChange={(event) => setNextStatus(event.target.value as TicketStatus)} value={nextStatus}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60" disabled={pending !== null || nextStatus === status} onClick={() => void update("status")} type="button">{pending === "status" ? "Saving…" : "Save status"}</button>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium text-slate-700">Priority<select className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900" onChange={(event) => setNextPriority(event.target.value as TicketPriority)} value={nextPriority}>{priorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60" disabled={pending !== null || nextPriority === priority} onClick={() => void update("priority")} type="button">{pending === "priority" ? "Saving…" : "Save priority"}</button>
        </div>
      </div>
      {message ? <p aria-live="polite" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p aria-live="assertive" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
    </section>
  );
}
