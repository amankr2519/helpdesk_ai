import Link from "next/link";
import SiteHeader from "@/components/site-header";

const issueTypes = [
  {
    icon: "⌁",
    title: "Network & Wi-Fi",
    description: "Connection drops, slow internet, or VPN trouble.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: "▦",
    title: "Software & apps",
    description: "Install, update, or troubleshoot an application.",
    color: "bg-violet-50 text-violet-700",
  },
  {
    icon: "⌘",
    title: "Devices & hardware",
    description: "Get help with your laptop, monitor, or peripherals.",
    color: "bg-amber-50 text-amber-700",
  },
  {
    icon: "◉",
    title: "Accounts & access",
    description: "Sign-in problems and access requests.",
    color: "bg-emerald-50 text-emerald-700",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_72%_44%,rgba(191,219,254,0.45),transparent_42%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10 lg:py-24">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3.5 py-2 text-xs font-semibold text-blue-800 shadow-sm">
                <span className="size-2 rounded-full bg-emerald-500" />
                A calmer way to get tech support
              </div>
              <h1 className="mt-7 text-5xl font-semibold leading-[1.05] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[4.25rem]">
                Stuck with tech?
                <span className="mt-2 block text-blue-700">Start here.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Describe what is happening in your own words. Get clear, safe steps to try, then bring in your support team if you still need a hand.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-800" href="/assistant">
                  Describe a problem
                  <span aria-hidden="true">→</span>
                </Link>
                <Link className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50" href="/assistant">
                  Explore the AI assistant
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-2"><span className="text-emerald-600">✓</span> No technical jargon</span>
                <span className="inline-flex items-center gap-2"><span className="text-emerald-600">✓</span> Safe steps, one at a time</span>
                <span className="inline-flex items-center gap-2"><span className="text-emerald-600">✓</span> Escalate when you need to</span>
              </div>
            </div>

            <div aria-label="Example of an AI troubleshooting conversation" className="relative mx-auto w-full max-w-[520px]">
              <div aria-hidden="true" className="absolute -right-5 -top-8 size-24 rounded-full border border-blue-200/70" />
              <div aria-hidden="true" className="absolute -bottom-6 -left-7 size-20 rounded-3xl bg-amber-100/70 rotate-12" />
              <div className="relative rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-[0_24px_70px_-30px_rgba(30,64,175,0.35)] sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                        <path d="M12 3.5 14 9l5.5 2-5.5 2-2 5.5L10 13l-5.5-2L10 9l2-5.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
                        <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" fill="currentColor" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">HelpDesk assistant</p>
                      <p className="mt-0.5 text-xs text-slate-500">Here to help you troubleshoot</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Ready</span>
                </div>

                <div className="space-y-4 py-5">
                  <div className="ml-auto max-w-[86%] rounded-2xl rounded-br-md bg-blue-700 px-4 py-3 text-sm leading-6 text-white">
                    My laptop is connected to Wi-Fi, but websites won’t load.
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">H</span>
                    <div className="rounded-2xl rounded-tl-md bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                      Let’s start with a quick check. Does this happen on other devices using the same Wi-Fi too?
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
                  <span className="flex-1">Tell us what’s going on…</span>
                  <span className="flex size-8 items-center justify-center rounded-lg bg-blue-700 text-white">↑</span>
                </div>
                <p className="mt-3 text-center text-[11px] text-slate-400">AI suggestions can be imperfect. Verify important changes.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-blue-700">What can we help with?</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">A good place to start</h2>
            </div>
            <Link className="text-sm font-semibold text-blue-700 hover:text-blue-900" href="/assistant">Browse all topics <span aria-hidden="true">→</span></Link>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {issueTypes.map((issue) => (
              <Link className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-950/5" href="/assistant" key={issue.title}>
                <span className={`flex size-11 items-center justify-center rounded-xl text-xl font-semibold ${issue.color}`}>{issue.icon}</span>
                <h3 className="mt-5 font-semibold text-slate-950">{issue.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{issue.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">Get help <span className="transition group-hover:translate-x-1">→</span></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[0.7fr_1.3fr] md:items-center md:py-14">
            <div>
              <p className="text-sm font-semibold text-amber-700">A helpful starting point</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Try a few safe steps. Know when to ask for help.</h2>
            </div>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              HelpDesk AI offers suggestions based on what you describe. It cannot see or change your device, and its advice may be inaccurate. Check important changes with your IT team, and contact your security team right away if you suspect an account or device has been compromised.
            </p>
          </div>
        </section>
      </main>
      <footer className="bg-slate-950 text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>HelpDesk AI</p>
          <p>Clear guidance for everyday tech problems.</p>
        </div>
      </footer>
    </>
  );
}
