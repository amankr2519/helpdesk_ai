import Link from "next/link";

const navClass =
  "rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950";

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link aria-label="HelpDesk AI home" className="flex items-center gap-3" href="/">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm shadow-blue-900/15">
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
              <path d="M5 12.5a7 7 0 0 1 14 0v4a2 2 0 0 1-2 2h-1.5M5 12.5v4a2 2 0 0 0 2 2h1.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
              <path d="M8.5 13.5v3M15.5 13.5v3M9 8.5a4.5 4.5 0 0 1 6 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold tracking-tight text-slate-950">HelpDesk AI</span>
            <span className="mt-0.5 block text-[11px] font-medium text-slate-500">Support, made simpler</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-1">
          <Link className={`${navClass} hidden sm:inline-flex`} href="/">Home</Link>
          <Link className={navClass} href="/assistant">AI Assistant</Link>
          <Link className="ml-1 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800" href="/admin/login">
            Staff sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
