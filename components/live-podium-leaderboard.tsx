"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Signal, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { LeaderboardEntry, PublicLeaderboardResponse } from "@/lib/types";

type LivePodiumLeaderboardProps = {
  initialData: PublicLeaderboardResponse;
};

type PodiumSlot = {
  rank: number;
  label: string;
  heightClass: string;
  alignClass: string;
};

const podiumSlots: PodiumSlot[] = [
  { rank: 3, label: "3rd", heightClass: "h-30 md:h-56", alignClass: "md:translate-y-10" },
  { rank: 1, label: "1st", heightClass: "h-40 md:h-80", alignClass: "" },
  { rank: 2, label: "2nd", heightClass: "h-35 md:h-68", alignClass: "md:translate-y-6" },
];

function formatOrdinal(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

function PodiumBlock({
  team,
  slot,
}: {
  team: LeaderboardEntry | undefined;
  slot: PodiumSlot;
}) {
  return (
    <div className={`flex min-w-0 flex-col justify-end ${slot.alignClass}`}>
      <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/34 md:mb-3 md:text-[11px] md:tracking-[0.22em]">
        {slot.label}
      </div>
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        className={`relative flex ${slot.heightClass} min-h-[7.5rem] flex-col justify-between overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.3)] md:min-h-[11rem] md:rounded-[30px] md:p-5`}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-90 blur-2xl"
          style={{
            background: team
              ? `radial-gradient(circle at top, ${team.color}33 0%, transparent 70%)`
              : "radial-gradient(circle at top, rgba(255,255,255,0.06) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div
            className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-[0_0_24px_rgba(255,255,255,0.14)]"
            style={{ backgroundColor: team?.color ?? "rgba(255,255,255,0.24)" }}
          />
          <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/48 md:px-3 md:text-[10px] md:tracking-[0.18em]">
            {team ? `${team.total_points} pts` : "Open"}
          </div>
        </div>

        <div className="relative z-10 mt-auto">
          <AnimatePresence mode="popLayout">
            {team ? (
              <motion.div
                key={`${slot.rank}-${team.id}-${team.total_points}`}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                initial={{ opacity: 0, y: 14 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/38 md:text-[10px] md:tracking-[0.18em]">
                  {team.badge_label}
                </div>
                <div className="mt-1.5 text-lg font-semibold text-white md:mt-2 md:text-3xl">
                  {team.team_name}
                </div>
                <div className="mt-1 text-xs text-white/52 md:mt-2 md:text-sm">
                  {team.completed_count}/{team.total_challenges} complete
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`${slot.rank}-empty`}
                animate={{ opacity: 1 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="text-sm text-white/34"
              >
                Awaiting team
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function FourthPlaceBlock({ team }: { team: LeaderboardEntry | undefined }) {
  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.22)] md:rounded-[30px] md:p-5"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-90 blur-2xl"
        style={{
          background: team
            ? `radial-gradient(circle at top, ${team.color}26 0%, transparent 72%)`
            : "radial-gradient(circle at top, rgba(255,255,255,0.06) 0%, transparent 72%)",
        }}
      />
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/36">
            4th Place
          </div>
          {team ? (
            <>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className="h-3.5 w-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: team.color }}
                />
                <span className="truncate text-lg font-semibold text-white md:text-xl">{team.team_name}</span>
              </div>
              <div className="mt-2 text-sm text-white/52">
                {team.badge_label} · {team.completed_count}/{team.total_challenges} complete
              </div>
            </>
          ) : (
            <div className="mt-2 text-sm text-white/34">No team in 4th yet.</div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={team ? `${team.id}-${team.total_points}` : "empty"}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              initial={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.24 }}
            >
              <div className="text-2xl font-semibold text-white md:text-3xl">{team?.total_points ?? 0}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">
                points
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export function LivePodiumLeaderboard({ initialData }: LivePodiumLeaderboardProps) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    const poll = window.setInterval(async () => {
      const response = await fetch("/api/public/leaderboard", { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as PublicLeaderboardResponse;
      setData(next);
    }, 5000);

    return () => window.clearInterval(poll);
  }, []);

  const rankMap = useMemo(() => {
    const next = new Map<number, LeaderboardEntry>();
    for (const team of data.leaderboard) {
      next.set(team.leaderboard_rank, team);
    }
    return next;
  }, [data.leaderboard]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.12),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.04),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_18%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.016)_1px,transparent_1px)] bg-[size:80px_80px] opacity-25" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 md:px-6 md:py-8">
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
                Live Podium
              </div>
              <h1 className="font-serif text-5xl leading-none text-white sm:text-6xl md:text-7xl">
                Leaderboard
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/54 sm:text-lg">
                TV-style live standings for Converge. Podium movement updates automatically as ranks change.
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

        <section className="mt-8 grid flex-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[38px] border border-white/10 bg-black/18 p-5 shadow-[0_28px_100px_rgba(0,0,0,0.36)] backdrop-blur-xl md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/34">
                  Podium
                </div>
                <div className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                  Live top four
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/54">
                <Trophy className="h-4 w-4 text-orange-300" />
                Updates automatically
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1.15fr_1fr] md:items-end md:gap-4">
              {podiumSlots.map((slot) => (
                <PodiumBlock key={slot.rank} slot={slot} team={rankMap.get(slot.rank)} />
              ))}
            </div>

            <div className="mt-4">
              <FourthPlaceBlock team={rankMap.get(4)} />
            </div>
          </div>

          <div className="rounded-[38px] border border-white/10 bg-black/18 p-5 shadow-[0_28px_100px_rgba(0,0,0,0.36)] backdrop-blur-xl md:p-8">
            <div className="mb-5">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/34">
                Ranking Strip
              </div>
              <div className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                Live order
              </div>
            </div>

            <motion.div layout className="space-y-3">
              <AnimatePresence initial={false}>
                {data.leaderboard.map((team) => (
                  <motion.div
                    key={team.id}
                    layout
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    className="rounded-[26px] border border-white/10 bg-white/[0.05] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-3">
                          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                            {formatOrdinal(team.leaderboard_rank)}
                          </div>
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: team.color }}
                          />
                          <span className="truncate text-lg font-semibold text-white">
                            {team.team_name}
                          </span>
                        </div>
                        <div className="text-sm text-white/52">
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
                          <div className="text-3xl font-semibold text-white">{team.total_points}</div>
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
          </div>
        </section>
      </div>
    </main>
  );
}
