import type { Metadata } from "next";
import LoginForm from "@/app/admin/login/login-form";

export const metadata: Metadata = {
  title: "Staff sign in | HelpDesk AI",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Staff access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign in with your HelpDesk AI staff account to manage support tickets.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
