"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CreateRaceModal } from "@/components/create-race-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroMode = {
  key: string;
  label: string;
  headline: string;
  subline: string;
};

function GridFieldLight() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,0,0,0.05),transparent_35%),radial-gradient(circle_at_85%_30%,rgba(0,0,0,0.03),transparent_40%)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        animate={{ backgroundPosition: ["0px 0px", "0px -64px"] }}
        transition={{ duration: 22, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.045) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_center,black_0%,black_55%,transparent_82%)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.06)_1px,transparent_1px)] bg-[size:152px_152px]" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#fbfaf8] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#fbfaf8] to-transparent" />
    </>
  );
}

function PointerSpotlight() {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 120, damping: 20, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 120, damping: 20, mass: 0.4 });

  useEffect(() => {
    if (reduceMotion) return;

    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduceMotion, x, y]);

  if (reduceMotion) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(260px 260px at var(--x) var(--y), rgba(0,0,0,0.10), transparent 60%)",
        ["--x" as any]: sx,
        ["--y" as any]: sy,
      }}
    />
  );
}

function MagneticWrap({
  children,
  strength = 14,
}: {
  children: React.ReactNode;
  strength?: number;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.25 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.25 });

  return (
    <motion.div
      ref={ref}
      style={reduceMotion ? undefined : { x: sx, y: sy }}
      onPointerMove={(event) => {
        if (reduceMotion) return;
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        x.set(px * strength);
        y.set(py * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

function ConvergePlot() {
  const reduceMotion = useReducedMotion();
  const points = useMemo(
    () => [
      { x: 20, y: 28 },
      { x: 78, y: 22 },
      { x: 86, y: 60 },
      { x: 26, y: 78 },
      { x: 12, y: 58 },
    ],
    []
  );

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-black/10 bg-white/55 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.08)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-black/55">
          Live convergence preview
        </div>
        <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-medium text-black/70">
          Toronto
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-black/10 bg-white/70 p-4">
        <svg
          className="h-[220px] w-full"
          viewBox="0 0 100 100"
          fill="none"
          role="img"
          aria-label="Teams converging toward Union Station"
        >
          <defs>
            <linearGradient id="fade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0.22)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.06)" />
            </linearGradient>
            <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.8" />
            </filter>
          </defs>

          <rect x="0" y="0" width="100" height="100" rx="10" fill="transparent" />
          <g opacity="0.32">
            {Array.from({ length: 10 }).map((_, i) => (
              <path
                key={`g1-${i}`}
                d={`M ${i * 10} 0 V 100`}
                stroke="rgba(0,0,0,0.12)"
                strokeWidth="0.6"
              />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <path
                key={`g2-${i}`}
                d={`M 0 ${i * 10} H 100`}
                stroke="rgba(0,0,0,0.12)"
                strokeWidth="0.6"
              />
            ))}
          </g>

          <g filter="url(#soft)">
            <circle cx="50" cy="50" r="11.5" fill="rgba(0,0,0,0.06)" />
          </g>
          <circle cx="50" cy="50" r="7.2" fill="rgba(0,0,0,0.86)" />
          <circle cx="50" cy="50" r="13" stroke="rgba(0,0,0,0.14)" strokeWidth="0.8" />

          {points.map((p, i) => (
            <g key={`p-${i}`}>
              <path
                d={`M ${p.x} ${p.y} L 50 50`}
                stroke="url(#fade)"
                strokeWidth="1"
              />
              <motion.circle
                cx={p.x}
                cy={p.y}
                r="2.6"
                fill="rgba(0,0,0,0.72)"
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: [0.55, 0.85, 0.55],
                      }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 2.6 + i * 0.4, ease: "easeInOut", repeat: Infinity }
                }
              />
            </g>
          ))}

          <text
            x="50"
            y="79"
            textAnchor="middle"
            fontSize="4.6"
            fill="rgba(0,0,0,0.62)"
            fontFamily="var(--font-geist)"
          >
            UNION
          </text>
        </svg>
      </div>

      <div className="mt-4 text-sm text-black/55">
        A clean HQ view of routes, check-ins, and proof. Built for phones.
      </div>
    </div>
  );
}

export function LandingPage() {
  const [isCreateRaceOpen, setIsCreateRaceOpen] = useState(false);
  const [modeKey, setModeKey] = useState("run");

  const modes: HeroMode[] = useMemo(
    () => [
      {
        key: "run",
        label: "Race",
        headline: "Start apart. End together.",
        subline: "Teams spread across Toronto, then converge at Union.",
      },
      {
        key: "hq",
        label: "HQ Drops",
        headline: "HQ keeps it moving.",
        subline: "New prompts land mid-walk. Submit proof and keep going.",
      },
      {
        key: "proof",
        label: "Proof",
        headline: "Proof-first progress.",
        subline: "Upload photos or leave a note. HQ verifies live.",
      },
    ],
    []
  );

  const activeMode = modes.find((m) => m.key === modeKey) ?? modes[0];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fbfaf8] text-[#0c0c0f]">
      <GridFieldLight />
      <PointerSpotlight />

      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#fbfaf8]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-black text-lg font-semibold text-white shadow-[0_22px_80px_rgba(0,0,0,0.18)]">
              C
            </span>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/45">
                Toronto Team City Challenge
              </div>
              <div className="text-sm font-medium text-black">Converge</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Button
              asChild
              className="hidden rounded-full border border-black/10 bg-transparent text-black hover:bg-black/[0.04] md:inline-flex"
              variant="secondary"
            >
              <Link href="/team">Team Login</Link>
            </Button>
            <Button
              className="h-11 rounded-full bg-black px-5 text-sm font-semibold text-white hover:bg-black/90"
              onClick={() => setIsCreateRaceOpen(true)}
            >
              Start Converge
            </Button>
          </div>
        </div>
      </header>

      <section className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-14 md:px-6 md:pb-28 md:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge className="mb-6 border-black/10 bg-black/[0.04] px-4 py-1.5 text-black/70">
              Toronto team city challenge
            </Badge>

            <h1 className="font-serif text-[clamp(3.2rem,9vw,6.6rem)] leading-[0.9] tracking-[-0.07em]">
              Converge.
            </h1>

            <div className="mt-6 flex flex-wrap gap-2">
              {modes.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setModeKey(mode.key)}
                  className={cn(
                    "relative rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.18em] uppercase transition",
                    mode.key === activeMode.key
                      ? "border-black/10 text-black"
                      : "border-black/10 bg-white/70 text-black/60 hover:bg-white"
                  )}
                >
                  {mode.key === activeMode.key ? (
                    <motion.span
                      layoutId="hero-mode"
                      className="absolute inset-0 rounded-full bg-black/[0.06]"
                      transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.4 }}
                    />
                  ) : null}
                  <span className="relative">{mode.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeMode.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="text-2xl font-semibold tracking-[-0.02em] text-black sm:text-3xl">
                    {activeMode.headline}
                  </div>
                  <p className="mt-3 max-w-xl text-lg leading-8 text-black/60 sm:text-xl">
                    {activeMode.subline}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <MagneticWrap>
                <Button
                  className="h-12 rounded-full bg-black px-6 text-sm font-semibold text-white hover:bg-black/90"
                  onClick={() => setIsCreateRaceOpen(true)}
                >
                  Start Converge
                </Button>
              </MagneticWrap>
              <Button
                asChild
                className={cn(
                  "h-12 rounded-full border border-black/10 bg-transparent px-6 text-black hover:bg-black/[0.04]"
                )}
                variant="secondary"
              >
                <Link href="/team">
                  Team login
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-5 text-xs text-black/45">
              Best on mobile. For GPS, use Chrome if you can.
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <ConvergePlot />
          </motion.div>
        </div>
      </section>

      <footer className="relative border-t border-black/10 bg-[#fbfaf8]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 md:px-6 md:py-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/45">
                Converge
              </div>
              <div className="mt-2 text-sm text-black/60">
                Toronto team city challenge with HQ control and live checkpoints.
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="h-11 rounded-full bg-black px-5 text-sm font-semibold text-white hover:bg-black/90"
                onClick={() => setIsCreateRaceOpen(true)}
              >
                Start Converge
              </Button>
              <Button
                asChild
                className="h-11 rounded-full border border-black/10 bg-transparent px-5 text-black hover:bg-black/[0.04]"
                variant="secondary"
              >
                <Link href="/team">Team login</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-6 text-xs text-black/45">
            <span>© {new Date().getFullYear()} Converge</span>
            <span>Union Station finish</span>
          </div>
        </div>
      </footer>

      <CreateRaceModal open={isCreateRaceOpen} onOpenChange={setIsCreateRaceOpen} />
    </main>
  );
}
