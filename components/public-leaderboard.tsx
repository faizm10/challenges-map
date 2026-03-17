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
  mapTeams: Array<Pick<TeamSeed, "id" | "teamName" | "startLocationName" | "color" | "routeLine" | "coordinates">>;
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
    <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-7 md:px-6 md:py-8">
      <Card className="grid gap-6 p-7 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Live Leaderboard</p>
          <h1 className="max-w-[10ch] font-serif text-5xl leading-none sm:text-6xl">
            Race to Union
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Five teams race across Toronto toward Union Station while HQ drops
            challenges, teams submit proof, and the leaderboard reshuffles live.
          </p>
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary">{data.event.released_count}/5 challenges released</Badge>
            <Badge variant="secondary">{data.event.finish_point}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/team">Team Login</Link>
          </Button>
          <Button asChild>
            <Link href="/admin">HQ Admin</Link>
          </Button>
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Race Map
            </p>
            <h2 className="font-serif text-3xl">Routes converging on Union Station</h2>
          </div>
          <RaceMap teams={mapTeams} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Standings</CardTitle>
            <CardDescription>
              Rank is based on total points, then creativity, then arrival order.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {data.leaderboard.map((team) => (
              <div
                key={team.id}
                className="rounded-[24px] border border-border/80 bg-white/70 p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="secondary">#{team.leaderboard_rank}</Badge>
                      <Badge
                        variant="secondary"
                        className="border-transparent text-white"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.badge_label}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold">{team.team_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {team.start_location_name} · {team.walk_time}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{team.total_points}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      points
                    </p>
                  </div>
                </div>

                <div className="mb-4 h-3 rounded-full bg-stone-200">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${team.progress_percent}%`,
                      backgroundColor: team.color,
                    }}
                  />
                </div>

                <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/80 p-3">
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <Trophy className="h-4 w-4" />
                      Speed
                    </div>
                    <strong>{team.speed_points}</strong>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3">
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <Footprints className="h-4 w-4" />
                      Challenges
                    </div>
                    <strong>{team.challenge_points}</strong>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3">
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                      Creativity
                    </div>
                    <strong>{team.creativity_score}</strong>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">{team.completed_count}/5 complete</Badge>
                  {team.arrival_rank ? (
                    <Badge variant="success">
                      <Flag className="mr-1 h-3.5 w-3.5" />
                      {team.arrival_rank === 1
                        ? "1st to Union"
                        : `Arrived ${team.arrival_rank}`}
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
                    <p className="text-sm text-muted-foreground">No milestone unlocked yet.</p>
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
