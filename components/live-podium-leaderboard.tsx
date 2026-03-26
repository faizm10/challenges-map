"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Signal } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { PUBLIC_POLL_MS, subscribeWhileVisible } from "@/lib/client-poll";
import type { PublicLeaderboardResponse } from "@/lib/types";

function formatOrdinal(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

export function LivePodiumLeaderboard({
  initialData,
}: {
  initialData: PublicLeaderboardResponse;
}) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    return subscribeWhileVisible(async () => {
      const response = await fetch("/api/public/leaderboard", { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as PublicLeaderboardResponse;
      setData(next);
    }, PUBLIC_POLL_MS);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.12),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.04),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_18%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.016)_1px,transparent_1px)] bg-[size:80px_80px] opacity-25" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 md:px-6 md:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-4">
            <Button
              asChild
              className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10"
              variant="secondary"
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Home
              </Link>
            </Button>

            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/16 bg-orange-500/8 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-orange-200">
                <Signal className="h-3.5 w-3.5" />
                Live Leaderboard
              </div>
              <h1 className="font-serif text-5xl leading-none text-white sm:text-6xl md:text-7xl">
                Standings
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/54 sm:text-lg">
                Real-time team order for Converge. Rankings and points update automatically.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/36">
                Challenges
              </div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {data.event.released_count}/{data.event.total_challenges}
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/36">
                Finish
              </div>
              <div className="mt-2 text-sm leading-6 text-white/62">{data.event.finish_point}</div>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-[38px] border border-white/10 bg-black/18 p-5 shadow-[0_28px_100px_rgba(0,0,0,0.36)] backdrop-blur-xl md:p-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/34">
                Ranking Strip
              </div>
              <div className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                Live order
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/54">
              <Signal className="h-4 w-4 text-orange-300" />
              Updates automatically
            </div>
          </div>

          <motion.div layout className="space-y-3">
            <AnimatePresence initial={false}>
              {data.leaderboard.map((team) => (
                <motion.div
                  key={team.id}
                  layout
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="rounded-[26px] border border-white/10 bg-white/[0.05] p-4 md:p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                          {formatOrdinal(team.leaderboard_rank)}
                        </div>
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="truncate text-lg font-semibold text-white md:text-2xl">
                          {team.team_name}
                        </span>
                      </div>
                      <div className="text-sm text-white/52 md:text-base">
                        {team.badge_label} · {team.completed_count}/{team.total_challenges} complete
                      </div>
                    </div>

                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={`${team.id}-${team.total_points}`}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        initial={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.2 }}
                        className="shrink-0 text-right"
                      >
                        <div className="text-3xl font-semibold text-white md:text-4xl">
                          {team.total_points}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">
                          points
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
