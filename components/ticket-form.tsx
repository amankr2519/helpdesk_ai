"use client";

import { type FormEvent, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ticketCategories,
  ticketPriorities,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/domain";
import {
  ticketCreateSchema,
  ticketPrefillSchema,
  type TicketCreateInput,
} from "@/lib/validation";

type TicketFormValues = {
  title: string;
  description: string;
  category: TicketCategory | "";
  priority: TicketPriority;
  contactEmail: string;
  aiSummary: string;
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

const initialValues: TicketFormValues = {
  title: "",
  description: "",
  category: "",
  priority: "medium",
  contactEmail: "",
  aiSummary: "",
};

const DRAFT_STORAGE_KEY = "helpdesk-ticket-draft";

function subscribeToDraft(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("helpdesk-ticket-draft-changed", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("helpdesk-ticket-draft-changed", onStoreChange);
  };
}

function getDraftSnapshot(): string | null {
  return sessionStorage.getItem(DRAFT_STORAGE_KEY);
}

function getServerDraftSnapshot(): null {
  return null;
}

function clearTicketDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    window.dispatchEvent(new Event("helpdesk-ticket-draft-changed"));
  } catch {
    // The ticket has already been submitted; draft cleanup is best effort.
  }
}

function parseTicketDraft(snapshot: string | null): TicketFormValues | null {
  if (!snapshot) return null;
  try {
    const parsed = ticketPrefillSchema.safeParse(JSON.parse(snapshot) as unknown);
    if (!parsed.success) return null;
    return {
      title: parsed.data.title ?? "",
      description: parsed.data.description ?? "",
      category: parsed.data.category ?? "",
      priority: parsed.data.priority ?? "medium",
      contactEmail: "",
      aiSummary: parsed.data.aiSummary ?? "",
    };
  } catch {
    return null;
  }
}

type FieldName = keyof TicketFormValues;

export default function TicketForm() {
  const router = useRouter();
  const storedDraft = useSyncExternalStore(subscribeToDraft, getDraftSnapshot, getServerDraftSnapshot);
  const parsedDraft = parseTicketDraft(storedDraft);
  const defaultValues = parsedDraft ?? initialValues;
  const [editedValues, setEditedValues] = useState<TicketFormValues | null>(null);
  const values = editedValues ?? defaultValues;
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submissionKey = useRef<string | null>(null);

  function updateField(field: FieldName, value: string) {
    setEditedValues((current) => ({ ...(current ?? defaultValues), [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFormError(null);

    const parsed = ticketCreateSchema.safeParse(values);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        title: errors.title?.[0],
        description: errors.description?.[0],
        category: errors.category?.[0],
        priority: errors.priority?.[0],
        contactEmail: errors.contactEmail?.[0],
        aiSummary: errors.aiSummary?.[0],
      });
      return;
    }

    if (!submissionKey.current) submissionKey.current = crypto.randomUUID();
    setPending(true);

    try {
      const payload: TicketCreateInput & { submissionKey: string } = {
        ...parsed.data,
        category: parsed.data.category,
        submissionKey: submissionKey.current,
      };
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        ticketUrl?: string;
        error?: string;
        fieldErrors?: Partial<Record<FieldName, string[]>>;
      };

      if (!response.ok) {
        if (result.fieldErrors) {
          setFieldErrors({
            title: result.fieldErrors.title?.[0],
            description: result.fieldErrors.description?.[0],
            category: result.fieldErrors.category?.[0],
            priority: result.fieldErrors.priority?.[0],
            contactEmail: result.fieldErrors.contactEmail?.[0],
            aiSummary: result.fieldErrors.aiSummary?.[0],
          });
        }
        setFormError(result.error ?? "We couldn’t submit your ticket. Please try again.");
        return;
      }

      if (!result.ticketUrl) {
        setFormError("Your ticket was submitted, but we couldn’t open its tracking page. Refresh and try again.");
        return;
      }

      router.push(result.ticketUrl);
      router.refresh();
      clearTicketDraft();
    } catch {
      setFormError("Could not reach the server. Your request is safe to retry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-6" noValidate onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="ticket-title">Title <span className="text-rose-600">*</span></label>
        <input
          aria-describedby={fieldErrors.title ? "ticket-title-error" : "ticket-title-help"}
          aria-invalid={Boolean(fieldErrors.title)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 aria-[invalid=true]:border-rose-500"
          id="ticket-title"
          maxLength={120}
          onChange={(event) => updateField("title", event.target.value)}
          placeholder="For example: VPN disconnects every few minutes"
          required
          value={values.title}
        />
        {fieldErrors.title ? <p className="mt-1.5 text-xs text-rose-700" id="ticket-title-error">{fieldErrors.title}</p> : <p className="mt-1.5 text-xs text-slate-500" id="ticket-title-help">5–120 characters · {values.title.length}/120</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="ticket-description">What’s happening? <span className="text-rose-600">*</span></label>
        <textarea
          aria-describedby={fieldErrors.description ? "ticket-description-error" : "ticket-description-help"}
          aria-invalid={Boolean(fieldErrors.description)}
          className="min-h-36 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 aria-[invalid=true]:border-rose-500"
          id="ticket-description"
          maxLength={5_000}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Include what you expected, what happened, any error message, and steps you’ve already tried."
          required
          value={values.description}
        />
        {fieldErrors.description ? <p className="mt-1.5 text-xs text-rose-700" id="ticket-description-error">{fieldErrors.description}</p> : <p className="mt-1.5 text-xs text-slate-500" id="ticket-description-help">10–5,000 characters · {values.description.length.toLocaleString()}/5,000</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="ticket-category">Category <span className="text-rose-600">*</span></label>
          <select
            aria-describedby={fieldErrors.category ? "ticket-category-error" : undefined}
            aria-invalid={Boolean(fieldErrors.category)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 aria-[invalid=true]:border-rose-500"
            id="ticket-category"
            onChange={(event) => updateField("category", event.target.value)}
            required
            value={values.category}
          >
            <option disabled value="">Select a category</option>
            {ticketCategories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}
          </select>
          {fieldErrors.category ? <p className="mt-1.5 text-xs text-rose-700" id="ticket-category-error">{fieldErrors.category}</p> : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="ticket-priority">Priority</label>
          <select
            aria-describedby={fieldErrors.priority ? "ticket-priority-error" : "ticket-priority-help"}
            aria-invalid={Boolean(fieldErrors.priority)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 aria-[invalid=true]:border-rose-500"
            id="ticket-priority"
            onChange={(event) => updateField("priority", event.target.value)}
            value={values.priority}
          >
            {ticketPriorities.map((priority) => <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>)}
          </select>
          {fieldErrors.priority ? <p className="mt-1.5 text-xs text-rose-700" id="ticket-priority-error">{fieldErrors.priority}</p> : <p className="mt-1.5 text-xs text-slate-500" id="ticket-priority-help">You can adjust the suggested priority.</p>}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="ticket-email">Contact email <span className="font-normal text-slate-500">(optional)</span></label>
        <input
          aria-describedby={fieldErrors.contactEmail ? "ticket-email-error" : "ticket-email-help"}
          aria-invalid={Boolean(fieldErrors.contactEmail)}
          autoComplete="email"
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 aria-[invalid=true]:border-rose-500"
          id="ticket-email"
          maxLength={320}
          onChange={(event) => updateField("contactEmail", event.target.value)}
          placeholder="you@example.com"
          type="email"
          value={values.contactEmail}
        />
        {fieldErrors.contactEmail ? <p className="mt-1.5 text-xs text-rose-700" id="ticket-email-error">{fieldErrors.contactEmail}</p> : <p className="mt-1.5 text-xs text-slate-500" id="ticket-email-help">Only add this if support needs a way to contact you.</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="ticket-ai-summary">Troubleshooting summary <span className="font-normal text-slate-500">(optional)</span></label>
        <textarea
          aria-describedby={fieldErrors.aiSummary ? "ticket-summary-error" : "ticket-summary-help"}
          aria-invalid={Boolean(fieldErrors.aiSummary)}
          className="min-h-24 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 aria-[invalid=true]:border-rose-500"
          id="ticket-ai-summary"
          maxLength={2_000}
          onChange={(event) => updateField("aiSummary", event.target.value)}
          placeholder="Add a short summary of any troubleshooting already completed."
          value={values.aiSummary}
        />
        {fieldErrors.aiSummary ? <p className="mt-1.5 text-xs text-rose-700" id="ticket-summary-error">{fieldErrors.aiSummary}</p> : <p className="mt-1.5 text-xs text-slate-500" id="ticket-summary-help">Up to 2,000 characters.</p>}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
        <p className="text-sm font-semibold text-amber-950">Keep secrets out of your ticket</p>
        <p className="mt-1 text-xs leading-5 text-amber-900">Do not include passwords, one-time codes, recovery keys, API keys, or other sensitive credentials. If this is a security concern, contact your IT/security team directly.</p>
      </div>

      {formError || (storedDraft && !parsedDraft ? "The assistant summary could not be loaded. You can still fill in the form below." : null) ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{formError ?? "The assistant summary could not be loaded. You can still fill in the form below."}</p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Fields marked * are required.</p>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Submitting ticket…" : "Submit ticket"}
          {!pending ? <span aria-hidden="true">→</span> : null}
        </button>
      </div>
    </form>
  );
}
