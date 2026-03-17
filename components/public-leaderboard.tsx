"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag, Footprints, Sparkles, Trophy } from "lucide-react";

import { RaceMap } from "@/components/race-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicLeaderboardResponse, TeamSeed } from "@/lib/types";

type PublicLeaderboardProps = {
  initialData: PublicLeaderboardResponse;
  mapTeams: Array<
    Pick<TeamSeed, "id" | "teamName" | "startLocationName" | "color" | "routeLine" | "coordinates">
  >;
};

export function PublicLeaderboard({ initialData, mapTeams }: PublicLeaderboardProps) {
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

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-4 sm:py-7 md:px-6 md:py-8">
      <Card className="grid gap-6 border-white/8 bg-[#120f10]/88 p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.34)] lg:grid-cols-[1fr_auto] lg:items-start lg:p-7">
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
            Live Leaderboard
          </p>
          <h1 className="max-w-[10ch] font-serif text-4xl leading-none text-white sm:text-5xl md:text-6xl">
            Race to Union
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-white/58 sm:text-base">
            Five teams race across Toronto toward Union Station while HQ drops
            challenges, teams submit proof, and the leaderboard reshuffles live.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge className="border-white/10 bg-white/8 text-white/80" variant="secondary">
              {data.event.released_count}/5 challenges released
            </Badge>
            <Badge className="border-white/10 bg-white/8 text-white/70" variant="secondary">
              {data.event.finish_point}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
          <Button
            asChild
            className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
            variant="secondary"
          >
            <Link href="/team">Team Login</Link>
          </Button>
          <Button asChild className="w-full bg-orange-500 text-black hover:bg-orange-400 sm:w-auto">
            <Link href="/admin">HQ Admin</Link>
          </Button>
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 sm:space-y-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Race Map
            </p>
            <h2 className="font-serif text-2xl text-white sm:text-3xl">
              Routes converging on Union Station
            </h2>
          </div>
          <RaceMap teams={mapTeams} />
        </div>

        <Card className="border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-white sm:text-3xl">Standings</CardTitle>
            <CardDescription className="text-white/52">
              Rank is based on total points, then creativity, then arrival order.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {data.leaderboard.map((team) => (
              <div
                key={team.id}
                className="rounded-[24px] border border-white/8 bg-white/[0.05] p-4 text-white sm:p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge className="border-white/10 bg-white/8 text-white/82" variant="secondary">
                        #{team.leaderboard_rank}
                      </Badge>
                      <Badge
                        className="border-transparent text-white"
                        variant="secondary"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.badge_label}
                      </Badge>
                    </div>
                    <h3 className="truncate text-lg font-semibold text-white sm:text-xl">
                      {team.team_name}
                    </h3>
                    <p className="text-sm text-white/50">
                      {team.start_location_name} · {team.walk_time}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-bold text-white sm:text-3xl">{team.total_points}</p>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">
                      points
                    </p>
                  </div>
                </div>

                <div className="mb-4 h-2.5 rounded-full bg-white/8">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${team.progress_percent}%`,
                      backgroundColor: team.color,
                    }}
                  />
                </div>

                <div className="mb-4 grid grid-cols-3 gap-2 text-sm sm:gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                    <div className="mb-1 flex items-center gap-2 text-white/46">
                      <Trophy className="h-4 w-4" />
                      <span className="truncate">Speed</span>
                    </div>
                    <strong className="text-white">{team.speed_points}</strong>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                    <div className="mb-1 flex items-center gap-2 text-white/46">
                      <Footprints className="h-4 w-4" />
                      <span className="truncate">Challenges</span>
                    </div>
                    <strong className="text-white">{team.challenge_points}</strong>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.06] p-3">
                    <div className="mb-1 flex items-center gap-2 text-white/46">
                      <Sparkles className="h-4 w-4" />
                      <span className="truncate">Creativity</span>
                    </div>
                    <strong className="text-white">{team.creativity_score}</strong>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge className="border-white/10 bg-white/8 text-white/78" variant="secondary">
                    {team.completed_count}/5 complete
                  </Badge>
                  {team.arrival_rank ? (
                    <Badge variant="success">
                      <Flag className="mr-1 h-3.5 w-3.5" />
                      {team.arrival_rank === 1 ? "1st to Union" : `Arrived ${team.arrival_rank}`}
                    </Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {team.milestones.length ? (
                    team.milestones.map((milestone) => (
                      <Badge key={milestone} variant="warning">
                        {milestone}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-white/44">No milestone unlocked yet.</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
