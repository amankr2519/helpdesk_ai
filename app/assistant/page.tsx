import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import AssistantChat from "@/components/assistant-chat";

export const metadata: Metadata = {
  title: "AI troubleshooting assistant",
  description: "Describe a technology problem and get clear, safe steps to try.",
};

export default function AssistantPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-7 sm:py-12">
        <div className="mb-7 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800">
            <span className="size-2 rounded-full bg-emerald-500" />
            AI troubleshooting
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Let’s work through it together.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Describe what you see and what you’ve already tried. You’ll get practical steps and a clear next step if the issue needs your IT team.
          </p>
        </div>
        <AssistantChat />
        <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-5 text-slate-500">
          AI suggestions may be inaccurate. Don’t share passwords, one-time codes, recovery keys, or other secrets. Check important changes with your IT team.
        </p>
      </main>
    </>
  );
}
