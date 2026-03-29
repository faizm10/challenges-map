"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Camera,
  Flag,
  Laugh,
  MapPinned,
  MessageCircleMore,
  Play,
  Sparkles,
  Trophy,
  Users,
  WandSparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AnimatedCityMap } from "@/components/animated-city-map";
import { CountdownTimer } from "@/components/countdown-timer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PUBLIC_POLL_MS, subscribeWhileVisible } from "@/lib/client-poll";
import type { PublicLeaderboardResponse, TeamSeed } from "@/lib/types";

type LandingPageProps = {
  initialData: PublicLeaderboardResponse;
  mapTeams: Array<
    Pick<TeamSeed, "id" | "teamName" | "startLocationName" | "color">
  >;
  useLiveLeaderboardPoll?: boolean;
};

const steps = [
  {
    title: "Start across the city",
    copy: "Four teams launch from different Toronto origins at the same time.",
    icon: MapPinned,
  },
  {
    title: "Catch live HQ prompts",
    copy: "Challenges drop mid-race, forcing teams to adapt, improvise, and commit.",
    icon: WandSparkles,
  },
  {
    title: "Walk, film, perform",
    copy: "Every block becomes part race, part social experiment, part cinematic memory.",
    icon: Camera,
  },
  {
    title: "All paths hit Union",
    copy: "The city folds inward as every team converges on one final finish line.",
    icon: Flag,
  },
];

const challengeCards = [
  {
    title: "Recreate a meme",
    copy: "Take over the sidewalk with a frame-perfect recreation using whatever the city gives you.",
    icon: Laugh,
  },
  {
    title: "Talk to a stranger",
    copy: "Break the bubble, recruit a cameo, and turn a random moment into live proof.",
    icon: MessageCircleMore,
  },
  {
    title: "Capture a cinematic shot",
    copy: "Find your angle, use the skyline, and make the race feel like a trailer.",
    icon: Play,
  },
];

const teamMapPositions = [
  { x: 20, y: 16 },
  { x: 28, y: 28 },
  { x: 12, y: 66 },
  { x: 82, y: 36 },
  { x: 72, y: 18 },
];

function PixelDivider() {
  return (
    <div className="flex items-center justify-center gap-1 py-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-2 w-2 bg-foreground" />
      ))}
    </div>
  );
}

export function LandingPage({
  initialData,
  mapTeams,
  useLiveLeaderboardPoll = true,
}: LandingPageProps) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    if (!useLiveLeaderboardPoll) return;
    return subscribeWhileVisible(async () => {
      const response = await fetch("/api/public/leaderboard", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const next = (await response.json()) as PublicLeaderboardResponse;
      setData(next);
    }, PUBLIC_POLL_MS);
  }, [useLiveLeaderboardPoll]);

  const animatedTeams = mapTeams.map((team, index) => ({
    ...team,
    mapPosition: teamMapPositions[index] ?? {
      x: 20 + index * 10,
      y: 20 + index * 10,
    },
  }));

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-3 border-foreground bg-primary">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <Link className="flex items-center gap-2" href="/">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-primary-foreground bg-secondary">
              <span className="font-pixel text-xs text-secondary-foreground">C</span>
            </div>
            <span className="font-pixel text-[10px] text-primary-foreground uppercase">
              Converge
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href="/team">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/team">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-2xl px-4 pt-8 pb-6">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          {/* Pixel art city silhouette */}
          <div className="mx-auto mb-6 flex justify-center">
            <svg
              viewBox="0 0 160 60"
              className="w-48 text-foreground"
              fill="currentColor"
            >
              <rect x="10" y="30" width="8" height="30" />
              <rect x="12" y="24" width="4" height="6" />
              <rect x="22" y="20" width="12" height="40" />
              <rect x="26" y="14" width="4" height="6" />
              <rect x="38" y="35" width="8" height="25" />
              <rect x="50" y="10" width="14" height="50" />
              <rect x="54" y="4" width="6" height="6" />
              <rect x="68" y="25" width="10" height="35" />
              <rect x="82" y="15" width="12" height="45" />
              <rect x="86" y="8" width="4" height="7" />
              <rect x="98" y="32" width="8" height="28" />
              <rect x="110" y="22" width="10" height="38" />
              <rect x="124" y="28" width="8" height="32" />
              <rect x="136" y="18" width="14" height="42" />
              <rect x="140" y="12" width="6" height="6" />
              <rect x="0" y="58" width="160" height="2" />
            </svg>
          </div>

          <Badge variant="secondary" className="mb-4 inline-flex">
            Toronto City Challenge
          </Badge>

          <h1 className="font-pixel text-2xl leading-relaxed text-foreground sm:text-3xl">
            CONVERGE
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            Four teams. Live HQ prompts. Checkpoints, proof, and cinematic
            city movement built for a premium Toronto night out.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href="/team">Sign In</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/team">Sign Up</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Countdown */}
      <section className="mx-auto w-full max-w-2xl px-4 py-6">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-foreground" />
            <span className="font-pixel text-[10px] uppercase text-foreground">
              Next Event
            </span>
          </div>
          <CountdownTimer />
        </Card>
      </section>

      <PixelDivider />

      {/* How It Works */}
      <section id="how-it-works" className="mx-auto w-full max-w-2xl px-4 py-6 scroll-mt-16">
        <h2 className="mb-6 font-pixel text-base text-foreground uppercase text-center">
          How It Works
        </h2>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
              >
                <Card className="flex items-start gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground bg-secondary">
                    <span className="font-pixel text-xs text-secondary-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-foreground" />
                      <h3 className="font-pixel text-[10px] uppercase text-foreground">
                        {step.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {step.copy}
                    </p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      <PixelDivider />

      {/* Teams */}
      <section className="mx-auto w-full max-w-2xl px-4 py-6">
        <h2 className="mb-6 font-pixel text-base text-foreground uppercase text-center">
          Teams
        </h2>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-foreground" />
            <span className="font-pixel text-[10px] uppercase text-foreground">
              Active Squads
            </span>
          </div>
          <div className="space-y-2">
            {animatedTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between border-2 border-foreground bg-gb-lightest px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 border border-foreground"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="text-sm text-foreground">
                    {team.teamName}
                  </span>
                </div>
                <span className="font-pixel text-[8px] uppercase text-muted-foreground">
                  Ready
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <PixelDivider />

      {/* Live Map */}
      <section id="live-map" className="mx-auto w-full max-w-2xl px-4 py-6 scroll-mt-16">
        <h2 className="mb-4 font-pixel text-base text-foreground uppercase text-center">
          Live Map
        </h2>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <Badge variant="secondary">
            {data.event.total_challenges
              ? `${data.event.released_count}/${data.event.total_challenges} challenges`
              : "No challenges yet"}
          </Badge>
          <Badge variant="secondary">
            {data.event.finish_point}
          </Badge>
        </div>

        <AnimatedCityMap
          teams={animatedTeams}
          leaderboard={data.leaderboard}
        />
      </section>

      <PixelDivider />

      {/* Quest Board */}
      <section id="challenges" className="mx-auto w-full max-w-2xl px-4 py-6 scroll-mt-16">
        <h2 className="mb-6 font-pixel text-base text-foreground uppercase text-center">
          Quest Board
        </h2>

        <div className="space-y-3">
          {challengeCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
              >
                <Card className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground bg-primary">
                      <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-pixel text-[10px] uppercase text-foreground">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {card.copy}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      <PixelDivider />

      {/* Leaderboard Preview */}
      <section className="mx-auto w-full max-w-2xl px-4 py-6">
        <h2 className="mb-6 font-pixel text-base text-foreground uppercase text-center">
          Leaderboard
        </h2>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-foreground" />
            <span className="font-pixel text-[10px] uppercase text-foreground">
              Rankings
            </span>
          </div>
          <div className="space-y-2">
            {data.leaderboard.map((team, index) => (
              <div
                key={team.team_id}
                className="flex items-center justify-between border-2 border-foreground bg-gb-lightest px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="font-pixel text-xs text-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm text-foreground">
                    {team.team_name}
                  </span>
                </div>
                <span className="font-pixel text-xs text-foreground">
                  {team.total_points} pts
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <PixelDivider />

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-2xl px-4 py-8 pb-16">
        <Card className="bg-primary p-8 text-center">
          <h2 className="font-pixel text-sm uppercase text-primary-foreground leading-relaxed">
            Ready to Play?
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-xs leading-5 text-primary-foreground/80">
            Join the next Converge. Race through Toronto with your squad.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link href="/team">Sign In</Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="border-primary-foreground bg-gb-lightest text-foreground shadow-[3px_3px_0px_0px_var(--primary-foreground)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              <Link href="/team">Sign Up</Link>
            </Button>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t-3 border-foreground bg-primary px-4 py-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-pixel text-[8px] uppercase text-primary-foreground">
            Converge Toronto 2026
          </span>
        </div>
      </footer>
    </main>
  );
}
