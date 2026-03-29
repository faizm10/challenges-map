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
  WandSparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  initialData: _initialData,
  mapTeams: _mapTeams,
  useLiveLeaderboardPoll: _useLiveLeaderboardPoll = true,
}: LandingPageProps) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#090809] text-foreground">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center md:bg-[center_top]"
          style={{
            backgroundImage:
              "url('/images/landing/u1194229659_generate_a_pixel_gamified_toronto_landscape_pictu_eacc8824-0c44-43d2-a4cf-3af8d79357b3_0.png')",
          }}
        />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-lighten"
          style={{
            backgroundImage:
              "url('/images/landing/u1194229659_generate_a_pixel_gamified_toronto_landscape_pictu_415a8841-0d4c-4e47-b833-4cfe0a3dc69a_3.png')",
          }}
        />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35 mix-blend-screen"
          style={{
            backgroundImage:
              "url('/images/landing/u1194229659_generate_a_pixel_gamified_toronto_landscape_pictu_208a8505-04d8-407f-a202-6ea78d2f3571_3.png')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090809]/35 via-[#090809]/58 to-[#090809]/78" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(9,8,9,0.45)_70%,rgba(9,8,9,0.7)_100%)]" />
      </div>

      <div className="relative z-10">

        <section className="mx-auto w-full max-w-2xl px-4 pt-8 pb-6">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <Badge variant="secondary" className="mb-4 inline-flex">
              Toronto City Challenge
            </Badge>

            <h1 className="font-pixel text-4xl leading-tight text-foreground sm:text-6xl">
              End at the skyline.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-2xl">
              A Toronto city challenge built for teams who want the route, the
              rush, and the finish line to feel unforgettable.
            </p>
          </motion.div>
        </section>

        <PixelDivider />

        <section
          id="how-it-works"
          className="mx-auto w-full max-w-2xl px-4 py-6 scroll-mt-16"
        >
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

        <section
          id="challenges"
          className="mx-auto w-full max-w-2xl px-4 py-6 scroll-mt-16"
        >
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

        <section className="mx-auto w-full max-w-2xl px-4 py-8 pb-16">
          <Card className="bg-primary p-8 text-center">
            <h2 className="font-pixel text-sm uppercase text-primary-foreground leading-relaxed">
              Ready to play or run HQ?
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-xs leading-5 text-primary-foreground/80">
              Teams: enter the 6-digit PIN your organizer sent, then sign in.
            </p>
            <p className="mx-auto mt-4 max-w-sm text-xs leading-5 text-primary-foreground/80">
              Organizers: create an account and set up your game URL.
            </p>
            
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                <Link href="/join">Join your game</Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="w-full border-primary-foreground bg-[#e6d3b5] text-[#5a3c2a] shadow-[3px_3px_0px_0px_var(--primary-foreground)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] sm:w-auto"
              >
                <Link href="/host?mode=signup&next=%2Fe%2Fcreate">Host a game</Link>
              </Button>
            </div>
            <p className="mt-4 flex flex-col items-center gap-2 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4 sm:gap-y-1">
              <Link
                href="/host?mode=login&next=%2Fe%2Fcreate"
                className="font-pixel text-[9px] uppercase tracking-wider text-primary-foreground/90 underline-offset-4 hover:underline"
              >
                Organizer log in
              </Link>
              <span className="hidden text-primary-foreground/40 sm:inline" aria-hidden>
                ·
              </span>
              <Link
                href="/leaderboard"
                className="font-pixel text-[9px] uppercase tracking-wider text-primary-foreground/90 underline-offset-4 hover:underline"
              >
                Live leaderboard
              </Link>
            </p>
          </Card>
        </section>

        <footer className="border-t-3 border-foreground bg-primary px-4 py-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="font-pixel text-[16px] uppercase text-primary-foreground">
              Converge Toronto 2026
            </span>
          </div>
          <div className="mx-auto mt-2 flex max-w-2xl items-center justify-center gap-1 text-sm text-primary-foreground/80">
            <span>Built by</span>
            <a
              href="https://www.linkedin.com/in/adelynntran810/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
            Adelynn 
            </a>
            <span>&amp;</span>
            <a
              href="https://www.linkedin.com/in/faizmustansar/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
            Faiz
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
