"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Footprints } from "lucide-react";

import { RaceMap } from "@/components/race-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PUBLIC_POLL_MS, subscribeWhileVisible } from "@/lib/client-poll";
import type { PublicLeaderboardResponse, TeamSeed } from "@/lib/types";

type PublicLeaderboardProps = {
  initialData: PublicLeaderboardResponse;
  mapTeams: Array<
    Pick<TeamSeed, "id" | "teamName" | "startLocationName" | "color" | "routeLine" | "coordinates">
  >;
  eventSlug?: string;
};

export function PublicLeaderboard({
  initialData,
  mapTeams,
  eventSlug = "converge",
}: PublicLeaderboardProps) {
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
    <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-4 sm:py-7 md:px-6 md:py-8">
      <Card className="grid gap-6 p-5 lg:grid-cols-[1fr_auto] lg:items-start lg:p-7">
        <div className="space-y-4">
          <p className="font-pixel text-[10px] uppercase tracking-[0.18em] text-primary">
            Live Leaderboard
          </p>
          <h1 className="font-pixel max-w-[10ch] text-4xl uppercase leading-none text-foreground sm:text-5xl md:text-6xl">
            Converge
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            A Toronto team city challenge where live HQ prompts, checkpoints, media
            proof, and team movement reshape the standings in real time.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge className="border-border bg-gb-lightest text-foreground" variant="secondary">
              {data.event.total_challenges
                ? `${data.event.released_count}/${data.event.total_challenges} challenges released`
                : "No challenges created yet"}
            </Badge>
            <Badge className="border-border bg-gb-lightest text-muted-foreground" variant="secondary">
              {data.event.finish_point}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
          <Button
            asChild
            className="w-full border-border bg-card text-foreground hover:bg-gb-lightest sm:w-auto"
            variant="secondary"
          >
            <Link href={`/e/${eventSlug}/team`}>Team Login</Link>
          </Button>
          <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-secondary sm:w-auto">
            <Link href={`/e/${eventSlug}/admin`}>HQ Admin</Link>
          </Button>
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 sm:space-y-5">
          <div>
            <p className="font-pixel mb-2 text-[10px] uppercase tracking-[0.18em] text-primary">
              Race Map
            </p>
            <h2 className="font-pixel text-2xl uppercase text-foreground sm:text-3xl">
              Team routes converging on Union
            </h2>
          </div>
          <RaceMap teams={mapTeams} />
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-pixel text-xl uppercase text-foreground sm:text-2xl">Standings</CardTitle>
            <CardDescription className="text-muted-foreground">
              Rank is based on time-weighted challenge points.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {data.leaderboard.map((team) => (
              <div
                key={team.id}
                className="border-2 border-foreground bg-card p-4 shadow-[4px_4px_0px_0px_var(--foreground)] sm:p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge className="border-border bg-gb-lightest text-foreground" variant="secondary">
                        #{team.leaderboard_rank}
                      </Badge>
                      <Badge
                        className="border-transparent text-foreground"
                        variant="secondary"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.badge_label}
                      </Badge>
                    </div>
                    <h3 className="font-pixel truncate text-base uppercase text-foreground sm:text-lg">
                      {team.team_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {team.start_location_name} · {team.walk_time}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-pixel text-2xl text-foreground sm:text-3xl">{team.total_points}</p>
                    <p className="font-pixel text-[8px] uppercase tracking-[0.16em] text-muted-foreground">
                      points
                    </p>
                  </div>
                </div>

                <div className="mb-4 h-2.5 bg-gb-lightest">
                  <div
                    className="h-2.5 transition-all"
                    style={{
                      width: `${team.progress_percent}%`,
                      backgroundColor: team.color,
                    }}
                  />
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:gap-3">
                  <div className="border-2 border-foreground bg-card p-3">
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <Footprints className="h-4 w-4" />
                      <span className="font-pixel truncate text-[8px] uppercase">Points</span>
                    </div>
                    <strong className="text-foreground">{team.total_points}</strong>
                  </div>
                  <div className="border-2 border-foreground bg-card p-3">
                    <div className="font-pixel mb-1 text-[8px] uppercase text-muted-foreground">Completed</div>
                    <strong className="text-foreground">
                      {team.completed_count}/{team.total_challenges}
                    </strong>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge className="border-border bg-gb-lightest text-foreground" variant="secondary">
                    {team.completed_count}/{team.total_challenges} complete
                  </Badge>
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
