"use client";

import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AssistantResponse } from "@/lib/validation";
import type { TicketCategory, TicketPriority } from "@/lib/domain";

type UserEntry = { id: string; role: "user"; content: string };
type AssistantEntry = { id: string; role: "assistant"; response: AssistantResponse };
type ChatEntry = UserEntry | AssistantEntry;

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
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
  urgent: "Urgent",
};

const prompts = [
  "My Wi-Fi is connected, but websites won’t load.",
  "An app I need keeps freezing.",
  "I can’t sign in to my work account.",
];

function assistantHistory(entry: AssistantEntry): string {
  const { response } = entry;
  return [
    `Issue summary: ${response.summary}`,
    `Category: ${categoryLabels[response.category]}`,
    `Suggested priority: ${priorityLabels[response.priority]}`,
    `Steps: ${response.steps.join("; ")}`,
    response.clarifyingQuestion ? `Question: ${response.clarifyingQuestion}` : "",
    response.caution ? `Caution: ${response.caution}` : "",
    `Escalation: ${response.escalationRecommendation}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 4_000);
}

function PriorityPill({ priority }: { priority: TicketPriority }) {
  const tone = priority === "urgent" || priority === "high"
    ? "bg-rose-50 text-rose-700"
    : priority === "low"
      ? "bg-slate-100 text-slate-600"
      : "bg-amber-50 text-amber-800";

  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{priorityLabels[priority]}</span>;
}

export default function AssistantChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryText, setRetryText] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [followUpMode, setFollowUpMode] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const latestAssistant = [...messages].reverse().find((entry): entry is AssistantEntry => entry.role === "assistant");

  async function sendMessage(text: string, retry = false) {
    const content = text.trim();
    if (!content || pending) return;

    const lastMessage = messages.at(-1);
    const isRetryOfLast = retry && lastMessage?.role === "user" && lastMessage.content === content;
    const previousMessages = isRetryOfLast ? messages.slice(0, -1) : messages;
    const userEntry: UserEntry = { id: crypto.randomUUID(), role: "user", content };
    setMessages([...previousMessages, userEntry]);
    setInput("");
    setError(null);
    setRetryText(null);
    setSolved(false);
    setPending(true);

    const history = previousMessages.slice(-12).map((entry) => ({
      role: entry.role,
      content: entry.role === "user" ? entry.content : assistantHistory(entry),
    }));

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history }),
      });
      const result = (await response.json()) as AssistantResponse | { error?: string };
      if (!response.ok) {
        const message = "error" in result ? result.error : undefined;
        setError(message ?? "The assistant could not answer just now.");
        setRetryText(content);
        return;
      }

      setMessages([
        ...previousMessages,
        userEntry,
        { id: crypto.randomUUID(), role: "assistant", response: result as AssistantResponse },
      ]);
      setFollowUpMode(false);
    } catch {
      setError("Could not reach the assistant. Check your connection and try again.");
      setRetryText(content);
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function askFollowUp() {
    setFollowUpMode(true);
    inputRef.current?.focus();
  }

  function createTicketDraft(response: AssistantResponse) {
    const description = messages
      .filter((entry): entry is UserEntry => entry.role === "user")
      .map((entry) => entry.content)
      .join("\n\n")
      .slice(0, 4_800);
    const draft = {
      title: `Help with ${categoryLabels[response.category]}: ${response.summary}`.slice(0, 120),
      description: description || response.summary,
      category: response.category,
      priority: response.priority,
      aiSummary: response.summary,
    };

    try {
      sessionStorage.setItem("helpdesk-ticket-draft", JSON.stringify(draft));
      router.push("/tickets/new");
    } catch {
      setError("We couldn’t transfer the conversation. Please copy the summary and create a ticket manually.");
    }
  }

  function startNewConversation() {
    setMessages([]);
    setInput("");
    setError(null);
    setRetryText(null);
    setSolved(false);
    setFollowUpMode(false);
    inputRef.current?.focus();
  }

  return (
    <section aria-label="AI troubleshooting conversation" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_22px_60px_-35px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
              <path d="M12 3.5 14 9l5.5 2-5.5 2-2 5.5L10 13l-5.5-2L10 9l2-5.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
              <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" fill="currentColor" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">HelpDesk assistant</h2>
            <p className="mt-0.5 text-xs text-slate-500">Your conversation stays in this browser session</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Ready
        </span>
      </div>

      <div aria-live="polite" className="max-h-[58vh] min-h-[360px] space-y-5 overflow-y-auto bg-slate-50/70 px-4 py-5 sm:px-6 sm:py-7">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-2xl py-5 text-center sm:py-8">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200">
              <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
                <path d="M12 3.5 14 9l5.5 2-5.5 2-2 5.5L10 13l-5.5-2L10 9l2-5.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
              </svg>
            </span>
            <h3 className="mt-4 text-lg font-semibold text-slate-950">What’s giving you trouble?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Share what you expected, what happened instead, and any steps you’ve already tried.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {prompts.map((prompt) => (
                <button
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((entry, index) => {
          const isLatestAssistant = entry.role === "assistant" && index === messages.length - 1;

          if (entry.role === "user") {
            return (
              <div className="ml-auto flex max-w-[88%] items-end justify-end gap-2.5 sm:max-w-[78%]" key={entry.id}>
                <p className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-blue-700 px-4 py-3 text-sm leading-6 text-white shadow-sm">{entry.content}</p>
                <span aria-hidden="true" className="mb-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-800">You</span>
              </div>
            );
          }

          const { response } = entry;
          return (
            <article className="flex items-start gap-3" key={entry.id}>
              <span aria-hidden="true" className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-800">H</span>
              <div className="min-w-0 max-w-[92%] rounded-2xl rounded-tl-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-sm font-semibold leading-6 text-slate-950">{response.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">{categoryLabels[response.category]}</span>
                  <PriorityPill priority={response.priority} />
                </div>

                {response.clarifyingQuestion ? (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-800">A quick question</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{response.clarifyingQuestion}</p>
                  </div>
                ) : null}

                <div className="mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Try these steps</h3>
                  <ol className="mt-2 space-y-3">
                    {response.steps.map((step, stepIndex) => (
                      <li className="flex gap-3 text-sm leading-6 text-slate-700" key={`${stepIndex}-${step}`}>
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{stepIndex + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {response.caution ? (
                  <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-6 text-amber-950">
                    <span aria-hidden="true" className="mt-0.5">⚠</span>
                    <p><span className="font-semibold">Before you continue: </span>{response.caution}</p>
                  </div>
                ) : null}

                <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">What next</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{response.escalationRecommendation}</p>
                </div>

                {isLatestAssistant ? (
                  solved ? (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3">
                      <p className="text-sm font-semibold text-emerald-900">Glad that helped. Your issue is marked solved.</p>
                      <button className="text-xs font-semibold text-emerald-800 underline underline-offset-2" onClick={startNewConversation} type="button">Start another chat</button>
                    </div>
                  ) : (
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <button className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700" onClick={() => setSolved(true)} type="button">This solved my issue</button>
                      <button className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50" onClick={askFollowUp} type="button">Ask a follow-up</button>
                      <button className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100" onClick={() => createTicketDraft(response)} type="button">Create a ticket</button>
                    </div>
                  )
                ) : null}
              </div>
            </article>
          );
        })}

        {pending ? (
          <div className="flex items-start gap-3" role="status">
            <span aria-hidden="true" className="mt-1 flex size-8 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-800">H</span>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
              <span className="flex gap-1"><span className="size-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.2s]" /><span className="size-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.1s]" /><span className="size-1.5 animate-bounce rounded-full bg-blue-500" /></span>
              Thinking through safe next steps…
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
        {error ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3" role="alert">
            <p className="text-sm text-rose-800">{error}</p>
            {retryText ? <button className="text-sm font-semibold text-rose-900 underline underline-offset-2" onClick={() => void sendMessage(retryText, true)} type="button">Retry</button> : null}
          </div>
        ) : null}

        {solved ? null : (
          <form className="flex items-end gap-3 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="assistant-message">Describe your technical problem</label>
            <textarea
              className="max-h-36 min-h-11 flex-1 resize-y bg-transparent px-2 py-2 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
              disabled={pending}
              id="assistant-message"
              maxLength={4_000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={followUpMode ? "What happened when you tried that?" : "Describe what’s going on…"}
              ref={inputRef}
              required
              value={input}
            />
            <button
              aria-label={pending ? "Sending message" : "Send message"}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={pending || !input.trim()}
              type="submit"
            >
              {pending ? <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <span aria-hidden="true" className="text-lg">↑</span>}
            </button>
          </form>
        )}
        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-slate-400">
          <span>{input.length.toLocaleString()} / 4,000</span>
          <span>Enter to send · Shift + Enter for a new line</span>
        </div>
        {latestAssistant && !solved ? (
          <p className="sr-only">Latest suggestion category: {categoryLabels[latestAssistant.response.category]}</p>
        ) : null}
      </div>
    </section>
  );
}
