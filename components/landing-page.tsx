"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
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
import { ComingSoonWaitlistForm } from "@/components/coming-soon-waitlist-form";
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
  /** When false, keeps `initialData` only (e.g. static marketing mock; no `/api/public/leaderboard` polling). */
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

const testimonials = [
  {
    quote:
      "Best night in Toronto. It felt like the city had turned into a multiplayer level.",
    author: "Maya, Team Captain",
  },
  {
    quote: "Half scavenger hunt, half street film, all adrenaline.",
    author: "Jordan, HQ",
  },
  {
    quote:
      "It felt like a real-life game with just enough chaos to stay unforgettable.",
    author: "Alex, First to Union",
  },
];

const teamMapPositions = [
  { x: 20, y: 16 },
  { x: 28, y: 28 },
  { x: 12, y: 66 },
  { x: 82, y: 36 },
  { x: 72, y: 18 },
];

function SectionReveal({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, amount: 0.22 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.section>
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
    <main className="relative min-h-screen overflow-x-hidden bg-[#070607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.1),transparent_22%),radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.04),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_18%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />

      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#090809]/72 backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[1fr_auto_1fr] md:items-center md:px-6">
          <Link className="flex items-center gap-3 md:justify-self-start" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/95 font-serif text-xl text-black shadow-[0_0_30px_rgba(249,115,22,0.24)]">
              U
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/38">
                Toronto Team City Challenge
              </div>
              <div className="text-sm font-medium text-white">Converge</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-white/52 md:flex">
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
            <a href="#live-map" className="transition hover:text-white">
              Live map
            </a>
            <a href="#challenges" className="transition hover:text-white">
              Challenges
            </a>
            <a href="#finale" className="transition hover:text-white">
              Finale
            </a>
          </nav>

          <div className="hidden md:block" aria-hidden />
        </div>
      </header>

      <section className="relative mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-7xl items-center px-4 py-16 md:px-6 md:py-24">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-10">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 28 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <Badge className="mb-6 border-orange-400/18 bg-orange-500/8 px-4 py-1.5 text-orange-100/90">
                Premium team city challenge
              </Badge>
              <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-8xl">
                Converge on the city.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/54 sm:text-xl">
                Four teams. Live HQ prompts. Checkpoints, proof, and cinematic
                city movement built for a premium Toronto night out.
              </p>
            </motion.div>

            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap"
              initial={{ opacity: 0, y: 24 }}
              transition={{
                duration: 0.7,
                delay: 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Button
                asChild
                className="h-12 rounded-full bg-orange-500 px-8 text-sm font-semibold text-black hover:bg-orange-400"
              >
                <a href="#waitlist">Join waitlist</a>
              </Button>
            </motion.div>

            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 grid max-w-3xl gap-4 sm:grid-cols-3"
              initial={{ opacity: 0, y: 24 }}
              transition={{
                duration: 0.7,
                delay: 0.22,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {[
                { label: "Team Origins", value: "4 across Toronto" },
                { label: "Challenge Style", value: "Live, social, cinematic" },
                { label: "Finish Point", value: "Union Station" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 backdrop-blur-md"
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/34">
                    {item.label}
                  </div>
                  <div className="mt-3 text-lg font-semibold text-white">
                    {item.value}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{
              duration: 0.8,
              delay: 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="absolute -left-10 top-16 h-36 w-36 rounded-full bg-orange-500/12 blur-3xl" />
            <div className="absolute -right-8 bottom-12 h-40 w-40 rounded-full bg-white/4 blur-3xl" />
            <Card className="relative overflow-hidden rounded-[36px] border-white/8 !bg-[#161214]/88 p-0 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
              <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),transparent_36%),radial-gradient(circle_at_72%_18%,rgba(249,115,22,0.12),transparent_24%)]" />
              <div className="relative p-6 sm:p-8">
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/30">
                      Mission pulse
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      The next Converge starts soon.
                    </div>
                  </div>
                  <Badge
                    className="border-white/8 bg-white/6 text-white/76"
                    variant="secondary"
                  >
                    Premium chaos
                  </Badge>
                </div>

                <CountdownTimer />

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[28px] border border-white/8 bg-black/16 p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm text-white/52">
                      <Users className="h-4 w-4 text-orange-300" />
                      Live team selection
                    </div>
                    <div className="grid gap-2">
                      {animatedTeams.slice(0, 3).map((team) => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: team.color }}
                            />
                            <span className="text-sm text-white">
                              {team.teamName}
                            </span>
                          </div>
                          <span className="text-xs uppercase tracking-[0.18em] text-white/28">
                            Ready
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/8 bg-black/16 p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm text-white/52">
                      <Sparkles className="h-4 w-4 text-orange-300" />
                      HQ challenge cadence
                    </div>
                    <div className="space-y-3">
                      {[
                        "Drop 01 · Icebreaker",
                        "Drop 02 · Social",
                        "Drop 03 · Cinematic",
                      ].map((item, index) => (
                        <motion.div
                          key={item}
                          animate={{ opacity: [0.55, 1, 0.55] }}
                          className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-sm text-white/68"
                          transition={{
                            duration: 2.6,
                            delay: index * 0.35,
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                        >
                          {item}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#070607]" />
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-24 px-4 pb-24 md:px-6">
        <SectionReveal id="waitlist" className="scroll-mt-28">
          <Card className="border-white/10 bg-white/[0.045] p-8 backdrop-blur-md md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
              Early access
            </p>
            <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-white sm:text-4xl">
              Join the waitlist
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/58">
              Be first to know when Converge opens to the public — we&apos;ll email you when the live
              experience goes wide.
            </p>
            <ComingSoonWaitlistForm />
          </Card>
        </SectionReveal>

        <SectionReveal id="how-it-works" className="scroll-mt-28">
          <div className="mb-8 max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
              How it works
            </p>
            <h2 className="font-serif text-4xl leading-tight sm:text-5xl">
              A city walk turned into a live social game.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  className="group rounded-[30px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-md"
                  initial={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.55, delay: index * 0.08 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/12 text-orange-300 transition group-hover:bg-orange-500/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                    Step {index + 1}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/58">
                    {step.copy}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </SectionReveal>

        <SectionReveal id="live-map" className="scroll-mt-28">
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
                Live map
              </p>
              <h2 className="font-serif text-4xl leading-tight sm:text-5xl">
                Watch four teams move through Toronto toward one final
                convergence.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge
                className="border-white/10 bg-white/6 px-4 py-2 text-white/80"
                variant="secondary"
              >
                {data.event.total_challenges
                  ? `${data.event.released_count}/${data.event.total_challenges} challenges released`
                  : "No challenges live yet"}
              </Badge>
              <Badge
                className="border-white/10 bg-white/6 px-4 py-2 text-white/80"
                variant="secondary"
              >
                {data.event.finish_point}
              </Badge>
            </div>
          </div>

          <AnimatedCityMap
            teams={animatedTeams}
            leaderboard={data.leaderboard}
          />
        </SectionReveal>

        <SectionReveal id="challenges" className="scroll-mt-28">
          <div className="mb-8 max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
              Challenge design
            </p>
            <h2 className="font-serif text-4xl leading-tight sm:text-5xl">
              Built for cinematic moments, social risk, and controlled chaos.
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {challengeCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  className="rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.03] p-6 backdrop-blur-md"
                  initial={{ opacity: 0, y: 24 }}
                  transition={{ duration: 0.55, delay: index * 0.08 }}
                  viewport={{ once: true }}
                  whileHover={{
                    y: -8,
                    rotateX: 4,
                    rotateY: index === 1 ? 0 : index % 2 === 0 ? -3 : 3,
                  }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-orange-500/10 text-orange-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-white/58">
                    {card.copy}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </SectionReveal>
        <SectionReveal>
          <div className="rounded-[40px] border border-white/10 bg-white/[0.045] px-6 py-10 text-center sm:px-10 sm:py-14">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">
              Start your own Converge
            </p>
            <h2 className="mx-auto max-w-4xl font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Build a night people will talk about the whole ride home.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/58">
              We&apos;re opening the full experience soon. Join the waitlist and we&apos;ll email you
              when Converge goes public.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                asChild
                className="h-12 rounded-full bg-orange-500 px-8 text-sm font-semibold text-black hover:bg-orange-400"
              >
                <a href="#waitlist">Join waitlist</a>
              </Button>
            </div>
          </div>
        </SectionReveal>
      </div>
    </main>
  );
}
