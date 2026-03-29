import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ComingSoonWaitlistForm } from "@/components/coming-soon-waitlist-form";
import { Card } from "@/components/ui/card";
import { isPublicComingSoon } from "@/lib/public-site-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coming soon",
  description: "Converge is almost here. Join the waitlist to hear when we open to the public.",
};

export default function ComingSoonPage() {
  if (!isPublicComingSoon()) {
    redirect("/");
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#070607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.1),transparent_22%),radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.04),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_18%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />

      <header className="border-b border-white/8 bg-[#090809]/72 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-lg items-center justify-center px-4 py-6 md:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/95 font-serif text-xl text-black shadow-[0_0_30px_rgba(249,115,22,0.24)]">
              U
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/38">
                Toronto Team City Challenge
              </div>
              <div className="text-sm font-medium text-white">Converge</div>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-lg flex-col items-center justify-center px-4 py-16 md:px-6">
        <Card className="w-full border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-md md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400/90">Public preview</p>
          <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-white md:text-4xl">
            Coming soon
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/65">
            We&apos;re putting the finishing touches on the live map, leaderboard, and race-day experience.
            Leave your email and we&apos;ll let you know when Converge opens to everyone.
          </p>
          <ComingSoonWaitlistForm />
          <p className="mt-6 text-center text-sm text-white/40">
            Teams and organizers can still{" "}
            <Link className="text-orange-400/90 underline-offset-4 hover:underline" href="/join">
              join an event
            </Link>{" "}
            (team or HQ).
          </p>
        </Card>
      </section>
    </main>
  );
}
