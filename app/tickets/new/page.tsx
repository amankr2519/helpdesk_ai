import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import TicketForm from "@/components/ticket-form";

export const metadata: Metadata = {
  title: "Create a support ticket",
  description: "Send your issue to the support team and track its progress.",
};

export default function NewTicketPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-9 sm:px-8 sm:py-14">
        <div className="mb-7">
          <p className="text-sm font-semibold text-blue-700">Support ticket</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Tell us what you need help with.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Share the details that will help the support team understand the issue. You’ll get a private tracking page after you submit.</p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <TicketForm />
        </section>
      </main>
    </>
  );
}
