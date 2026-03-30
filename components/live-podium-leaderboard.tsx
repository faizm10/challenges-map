"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Signal } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  eventSlug,
}: {
  initialData: PublicLeaderboardResponse;
  eventSlug: string;
}) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    return subscribeWhileVisible(async () => {
      const response = await fetch(
        `/api/public/leaderboard?slug=${encodeURIComponent(eventSlug)}`,
        { cache: "no-store" }
      );
      if (!response.ok) return;
      const next = (await response.json()) as PublicLeaderboardResponse;
      setData(next);
    }, PUBLIC_POLL_MS);
  }, [eventSlug]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-5 md:px-6 md:py-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Home
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/join">Join event</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/e/${eventSlug}/team`}>Team</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/e/${eventSlug}/admin`}>HQ</Link>
            </Button>
          </div>

          <div>
            <div className="mb-3 inline-flex items-center gap-2 border-2 border-foreground bg-secondary px-3 py-1.5 font-pixel text-[8px] uppercase text-secondary-foreground">
              <Signal className="h-3 w-3" />
              Live
            </div>
            <h1 className="font-pixel text-xl uppercase text-foreground sm:text-2xl">
              Standings
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Real-time team order for {data.event.title}. Rankings and points update automatically.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Card className="px-4 py-3">
            <div className="font-pixel text-[7px] uppercase text-muted-foreground">
              Challenges
            </div>
            <div className="mt-1 font-pixel text-sm text-foreground">
              {data.event.released_count}/{data.event.total_challenges}
            </div>
          </Card>
          <Card className="px-4 py-3">
            <div className="font-pixel text-[7px] uppercase text-muted-foreground">
              Finish
            </div>
            <div className="mt-1 text-xs text-foreground">{data.event.finish_point}</div>
          </Card>
        </div>

        <section className="mt-6">
          <Card className="p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <span className="font-pixel text-[8px] uppercase text-muted-foreground">
                  Ranking
                </span>
                <div className="mt-1 font-pixel text-xs uppercase text-foreground">
                  Live order
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 border-2 border-foreground bg-gb-lightest px-2 py-1 font-pixel text-[7px] uppercase text-foreground">
                <Signal className="h-3 w-3 text-foreground" />
                Auto
              </div>
            </div>

            <motion.div layout className="space-y-2">
              <AnimatePresence initial={false}>
                {data.leaderboard.map((team) => (
                  <motion.div
                    key={team.id}
                    layout
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    className="border-2 border-foreground bg-gb-lightest p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="border border-foreground bg-card px-2 py-0.5 font-pixel text-[8px] uppercase text-foreground">
                            {formatOrdinal(team.leaderboard_rank)}
                          </span>
                          <span
                            className="h-3 w-3 border border-foreground"
                            style={{ backgroundColor: team.color }}
                          />
                          <span className="truncate font-pixel text-[10px] uppercase text-foreground">
                            {team.team_name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
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
                          <div className="font-pixel text-base text-foreground">
                            {team.total_points}
                          </div>
                          <div className="font-pixel text-[7px] uppercase text-muted-foreground">
                            pts
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </Card>
        </section>
      </div>
    </main>
  );
}
