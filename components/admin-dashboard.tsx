"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ChevronDown,
  Copy,
  Clock3,
  ExternalLink,
  Image as ImageIcon,
  LoaderCircle,
  MapPin,
  X,
  Video,
} from "lucide-react";

import { CheckinMap } from "@/components/checkin-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { DASHBOARD_POLL_MS, subscribeWhileVisible } from "@/lib/client-poll";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_CHECKPOINT_UNLOCK_RADIUS_METERS,
  MAX_CHALLENGES,
  UNION_STATION,
} from "@/lib/config";
import type { AdminCheckinFeedItem, AdminGameResponse, TeamCheckpoint, TeamChallengeStatus } from "@/lib/types";

function formatCoordinate(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return value.toString();
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string; hint?: string };
  if (!response.ok) {
    const base = data.error || "Request failed.";
    throw new Error(data.hint ? `${base} ${data.hint}` : base);
  }
  return data;
}

function reviewBadge(challenge: TeamChallengeStatus) {
  if (challenge.review_status === "verified") {
    return { label: "Verified", variant: "success" as const };
  }
  if (challenge.review_status === "rejected") {
    return { label: "Rejected", variant: "warning" as const };
  }
  return {
    label: challenge.status === "submitted" ? "Submitted" : "Not started",
    variant: challenge.status === "submitted" ? ("secondary" as const) : ("warning" as const),
  };
}

function checkpointBadge(checkpoint: TeamCheckpoint) {
  if (checkpoint.status === "verified") return { label: "Verified", variant: "success" as const };
  if (checkpoint.status === "rejected") return { label: "Rejected", variant: "warning" as const };
  if (checkpoint.status === "pending") return { label: "Pending", variant: "secondary" as const };
  return { label: "Not started", variant: "warning" as const };
}

function feedBadge(item: AdminCheckinFeedItem) {
  if (item.status === "verified") return "success" as const;
  if (item.status === "rejected") return "warning" as const;
  return "secondary" as const;
}

function getDefaultOpenCheckpointKey(checkpoints: TeamCheckpoint[]) {
  const submittedCandidate = checkpoints.find(
    (checkpoint) =>
      checkpoint.status !== "verified" && checkpoint.latest_checkin
  );
  if (submittedCandidate) return submittedCandidate.key;

  const unresolvedCandidate = checkpoints.find(
    (checkpoint) => checkpoint.status !== "verified"
  );
  return unresolvedCandidate?.key ?? null;
}

function getNextOpenCheckpointKey(checkpoints: TeamCheckpoint[], currentKey: string) {
  const currentIndex = checkpoints.findIndex((checkpoint) => checkpoint.key === currentKey);
  if (currentIndex === -1) return getDefaultOpenCheckpointKey(checkpoints);

  for (let index = currentIndex + 1; index < checkpoints.length; index += 1) {
    if (checkpoints[index].status !== "verified") {
      return checkpoints[index].key;
    }
  }

  for (let index = 0; index < checkpoints.length; index += 1) {
    if (checkpoints[index].status !== "verified") {
      return checkpoints[index].key;
    }
  }

  return null;
}

function extractTrailingNumber(value: string) {
  const match = value.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : null;
}

function challengeNumberClasses(challengeNumber: number | null) {
  const palette = [
    "border-orange-400/20 bg-orange-500/12 text-orange-200",
    "border-sky-400/20 bg-sky-500/12 text-sky-200",
    "border-emerald-400/20 bg-emerald-500/12 text-emerald-200",
    "border-fuchsia-400/20 bg-fuchsia-500/12 text-fuchsia-200",
    "border-amber-300/20 bg-amber-500/12 text-amber-100",
  ];

  if (!challengeNumber || challengeNumber < 1) {
    return "border-white/10 bg-white/[0.06] text-white/72";
  }

  return palette[(challengeNumber - 1) % palette.length];
}

function challengeKindLabel(challenge: TeamChallengeStatus | AdminGameResponse["challenges"][number]) {
  if (challenge.kind === "game_long") return "Game-long";
  if (challenge.kind === "union") return "Union";
  return "Checkpoint";
}

const CHECKIN_MESSAGES = [
  { title: "hey adelynn 👋", description: "it's faiz — just checking in on you" },
  { title: "yo adelynn!", description: "faiz here, checking in real quick" },
  { title: "adelynn, hey!", description: "faiz stopping by — just checking in" },
  { title: "checking in 🫡", description: "adelynn — faiz here, you good?" },
  { title: "hey! it's faiz 👀", description: "just checking in on you, adelynn" },
  { title: "adelynn!", description: "faiz dropping by to check in — all good?" },
  { title: "yo! faiz here 🤙", description: "checking in on adelynn, as promised" },
  { title: "hey adelynn 🙌", description: "faiz popping in to check in on you" },
];

export function AdminDashboard({ gameSlug }: { gameSlug: string }) {
  const [game, setGame] = useState<AdminGameResponse | null>(null);
  const [adminName, setAdminName] = useState("");
  const [pin, setPin] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamPin, setNewTeamPin] = useState("");
  const [teamFormError, setTeamFormError] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [openCheckpointByTeam, setOpenCheckpointByTeam] = useState<Record<number, string | null>>({});
  const [activeRecentCheckinId, setActiveRecentCheckinId] = useState<number | null>(null);
  const [activeProofIndex, setActiveProofIndex] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credCurrentPin, setCredCurrentPin] = useState("");
  const [credNewName, setCredNewName] = useState("");
  const [credNewPin, setCredNewPin] = useState("");
  const [credConfirmPin, setCredConfirmPin] = useState("");
  const [credError, setCredError] = useState("");
  const { toast } = useToast();
  const lastCheckInSlotRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date();
      const etStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
      const et = new Date(etStr);
      const h = et.getHours();
      const m = et.getMinutes();
      if (h < 11 || (h === 11 && m < 26)) return;
      const minutesSince = (h - 11) * 60 + (m - 24);
      if (minutesSince % 15 !== 0) return;
      const slotKey = h * 60 + m;
      if (lastCheckInSlotRef.current === slotKey) return;
      lastCheckInSlotRef.current = slotKey;
      const msg = CHECKIN_MESSAGES[(minutesSince / 15) % CHECKIN_MESSAGES.length];
      toast({ title: msg.title, description: msg.description, variant: "success", persistent: true });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [toast]);

  const loadGame = async () => {
    const next = await api<AdminGameResponse>("/api/admin/game");
    setGame(next);
    return next;
  };

  useEffect(() => {
    loadGame().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!game) return;
    return subscribeWhileVisible(() => {
      loadGame().catch(() => undefined);
    }, DASHBOARD_POLL_MS);
  }, [game]);

  const activeRecentCheckin =
    game?.recentCheckins.find((item) => item.id === activeRecentCheckinId) ?? null;

  useEffect(() => {
    if (!activeRecentCheckin) {
      setActiveProofIndex(0);
      return;
    }

    if (activeRecentCheckin.uploads.length === 0) {
      setActiveProofIndex(0);
      return;
    }

    setActiveProofIndex((current) =>
      Math.min(current, Math.max(0, activeRecentCheckin.uploads.length - 1))
    );
  }, [activeRecentCheckin]);

  useEffect(() => {
    if (!game) return;

    setOpenCheckpointByTeam((current) => {
      const next: Record<number, string | null> = {};

      for (const teamView of game.teams) {
        const existing = current[teamView.team.id];
        const stillValid =
          existing &&
          teamView.checkpoints.some(
            (checkpoint) =>
              checkpoint.key === existing && checkpoint.status !== "verified"
          );

        next[teamView.team.id] = stillValid
          ? existing
          : getDefaultOpenCheckpointKey(teamView.checkpoints);
      }

      return next;
    });
  }, [game]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPendingAction("login");

    try {
      await api("/api/auth/admin", {
        method: "POST",
        body: JSON.stringify({ gameSlug, name: adminName, pin }),
      });
      setAdminName("");
      setPin("");
      await loadGame();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to log in.");
    } finally {
      setPendingAction((current) => (current === "login" ? null : current));
    }
  }

  async function onLogout() {
    setPendingAction("logout");
    try {
      await api("/api/auth/logout", { method: "POST" });
      setGame(null);
    } finally {
      setPendingAction((current) => (current === "logout" ? null : current));
    }
  }

  async function onCreateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeamFormError("");
    setPendingAction("add-team");
    try {
      await api("/api/admin/teams", {
        method: "POST",
        body: JSON.stringify({ teamName: newTeamName, pin: newTeamPin }),
      });
      setNewTeamName("");
      setNewTeamPin("");
      await loadGame();
      toast({ title: "Team added", description: "They can sign in from the team link.", variant: "success" });
    } catch (nextError) {
      setTeamFormError(nextError instanceof Error ? nextError.message : "Unable to add team.");
    } finally {
      setPendingAction((current) => (current === "add-team" ? null : current));
    }
  }

  async function onUpdateCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCredError("");
    setPendingAction("credentials");
    try {
      await api("/api/admin/credentials", {
        method: "PATCH",
        body: JSON.stringify({
          currentPin: credCurrentPin,
          newName: credNewName,
          newPin: credNewPin,
          confirmNewPin: credConfirmPin,
        }),
      });
      setShowCredentials(false);
      setCredCurrentPin("");
      setCredNewPin("");
      setCredConfirmPin("");
      toast({
        title: "Credentials updated",
        description: "Your username and PIN have been saved.",
        variant: "success",
      });
    } catch (err) {
      setCredError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setPendingAction((current) => (current === "credentials" ? null : current));
    }
  }

  async function runAdminAction(
    pendingKey: string,
    action: () => Promise<void>,
    successTitle: string,
    successDescription?: string
  ) {
    setPendingAction(pendingKey);
    try {
      await action();
      toast({
        title: successTitle,
        description: successDescription,
        variant: "success",
      });
    } catch (nextError) {
      toast({
        title: "Action failed",
        description:
          nextError instanceof Error ? nextError.message : "Something went wrong.",
        variant: "error",
      });
    } finally {
      setPendingAction((current) => (current === pendingKey ? null : current));
    }
  }

  async function copyAddress(address: string) {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(address);
      toast({
        title: "Address copied",
        description: "Location copied to your clipboard.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access is unavailable on this device.",
        variant: "error",
      });
    }
  }

  if (!game) {
    return (
      <main className="relative flex min-h-screen w-full flex-col lg:flex-row">
        <style>{`
          @keyframes reg-fadein { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes reg-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          .reg-form { animation: reg-fadein 0.5s ease forwards; }
          .reg-dot { animation: reg-blink 1.4s step-end infinite; }
        `}</style>

        {/* Left: Toronto city image panel */}
        <div
          className="relative flex min-h-[40vh] flex-col justify-between p-8 lg:min-h-screen lg:w-[58%] lg:p-14"
          style={{
            backgroundImage: "url('/images/landing/u1194229659_generate_a_pixel_gamified_toronto_landscape_pictu_eacc8824-0c44-43d2-a4cf-3af8d79357b3_0.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Dark gradient: strong bottom so text reads, light in middle to show city */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#090809]/70 via-[#090809]/30 to-[#090809]/85" />
          {/* Right fade so it bleeds into the form panel */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#090809]/60 lg:to-[#090809]" />

          {/* Top: brand */}
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.35em] text-orange-500">Converge</p>
          </div>

          {/* Bottom: headline */}
          <div className="relative z-10 space-y-4">
            <p className="text-xs uppercase tracking-[0.25em] text-orange-400">HQ Command</p>
            <h1 className="text-4xl leading-tight text-[#e6d5b8] sm:text-5xl lg:text-6xl">
              Control<br />the chaos.
            </h1>
            <p className="max-w-xs text-sm leading-6 text-[#e6d5b8]/55">
              Release challenges, verify check-ins, review media, and keep the
              Converge leaderboard accurate in real time.
            </p>
            <Button
              asChild
              className="mt-2 border border-[#e6d5b8]/20 bg-transparent text-[#e6d5b8]/50 hover:bg-[#e6d5b8]/8 hover:text-[#e6d5b8]"
              variant="secondary"
            >
              <Link href={`/e/${gameSlug}/leaderboard`}>← Back to Leaderboard</Link>
            </Button>
          </div>
        </div>

        {/* Right: Registration form panel */}
        <div className="relative flex flex-1 flex-col items-center justify-center bg-[#090809] px-8 py-14 lg:px-14">
          {/* Subtle top-right decoration */}
          <div className="absolute right-6 top-6 flex items-center gap-2">
            <span className="reg-dot inline-block h-2 w-2 bg-orange-500" />
            <span className="text-xs uppercase tracking-widest text-[#e6d5b8]/25">Restricted</span>
          </div>

          <div className="reg-form w-full max-w-[360px] space-y-8">
            {/* Form header */}
            <div className="space-y-1 border-l-2 border-orange-500 pl-4">
              <p className="text-xs uppercase tracking-[0.25em] text-orange-500">Registration</p>
              <h2 className="text-3xl text-[#e6d5b8]">HQ Access</h2>
              <p className="text-xs text-[#e6d5b8]/40">
                Admin credentials only. Verified against{" "}
                <span className="font-mono text-[#e6d5b8]/55">access_credentials</span> for this event.
              </p>
              <p className="pt-1 font-mono text-[10px] leading-relaxed text-[#e6d5b8]/50">
                Event: /e/{gameSlug}/admin
              </p>
            </div>

            <form className="space-y-5" onSubmit={onLogin}>
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-widest text-[#e6d5b8]/45">
                  Admin Name
                </label>
                <Input
                  className="border border-[#e6d5b8]/12 bg-[#e6d5b8]/4 text-[#e6d5b8] placeholder:text-[#e6d5b8]/20 focus:border-orange-500 focus:ring-0"
                  type="text"
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  placeholder="Enter admin name"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-widest text-[#e6d5b8]/45">
                  PIN
                </label>
                <Input
                  className="border border-[#e6d5b8]/12 bg-[#e6d5b8]/4 tracking-widest text-[#e6d5b8] placeholder:text-[#e6d5b8]/20 focus:border-orange-500 focus:ring-0"
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  placeholder="••••••"
                  required
                />
              </div>

              {error ? (
                <div className="border-l-2 border-red-500 bg-red-500/8 px-3 py-2">
                  <p className="whitespace-pre-wrap text-left text-xs leading-relaxed text-red-400">{error}</p>
                </div>
              ) : null}

              <Button
                className="w-full border border-orange-500 bg-orange-500 text-black hover:bg-orange-400 hover:border-orange-400 disabled:opacity-50"
                disabled={pendingAction === "login"}
                type="submit"
              >
                {pendingAction === "login" ? (
                  <span className="flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Sign in to HQ"
                )}
              </Button>
            </form>

            <p className="text-center text-xs uppercase tracking-wider text-[#e6d5b8]/18">
              {gameSlug} — HQ access only
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
    <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:py-7 md:px-6 md:py-8">
      <Card className="grid gap-5 border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              HQ Dashboard
            </p>
            <h1 className="font-serif text-3xl text-white sm:text-4xl">
              Release challenges, verify check-ins, score teams.
            </h1>
            <p className="max-w-3xl text-white/56">
              The admin view refreshes every few seconds and highlights the latest team
              movement, proof, and checkpoint activity.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
            <Button
              asChild
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
              variant="secondary"
            >
              <Link href={`/e/${gameSlug}/leaderboard`}>Leaderboard</Link>
            </Button>
            <Button
              className="w-full bg-red-500/90 text-white hover:bg-red-500 sm:w-auto"
              disabled={pendingAction === "reset"}
              variant="destructive"
              onClick={() =>
                runAdminAction(
                  "reset",
                  async () => {
                    await api("/api/admin/reset", { method: "POST" });
                    await loadGame();
                  },
                  "Event reset",
                  "Challenges, submissions, media, and check-ins cleared for this event. Teams and PINs are unchanged."
                )
              }
            >
              Reset Game
            </Button>
            <Button
              className="w-full border-white/10 bg-white/5 text-white/72 hover:bg-white/10 hover:text-white sm:w-auto"
              variant="secondary"
              onClick={() => setShowCredentials(true)}
            >
              Change Credentials
            </Button>
            <Button
              className="w-full text-white/72 hover:bg-white/6 hover:text-white sm:w-auto"
              disabled={pendingAction === "logout"}
              variant="ghost"
              onClick={onLogout}
            >
              {pendingAction === "logout" ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                "Log Out"
              )}
            </Button>
          </div>
        </div>

        {game.teams.length === 0 ? (
          <div className="rounded-[24px] border border-amber-400/30 bg-amber-500/10 p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
              Step 1 — Teams
            </p>
            <h2 className="mb-2 text-lg font-semibold text-white">Add your first team</h2>
            <p className="mb-4 text-sm text-white/60">
              Create a team name and PIN so players can sign in at the team dashboard URL for this
              event. Add more teams anytime before you publish challenges.
            </p>
            <form className="flex max-w-md flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onCreateTeam}>
              <div className="min-w-0 flex-1 space-y-2">
                <label className="text-xs font-medium text-white/60">Team name</label>
                <Input
                  className="border-white/10 bg-white/5 text-white"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Team North"
                  required
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <label className="text-xs font-medium text-white/60">Team PIN</label>
                <Input
                  className="border-white/10 bg-white/5 text-white"
                  type="password"
                  value={newTeamPin}
                  onChange={(e) => setNewTeamPin(e.target.value)}
                  placeholder="PIN for team login"
                  required
                />
              </div>
              <Button
                className="bg-orange-500 text-black hover:bg-orange-400"
                disabled={pendingAction === "add-team"}
                type="submit"
              >
                {pendingAction === "add-team" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  "Add team"
                )}
              </Button>
            </form>
            {teamFormError ? <p className="mt-2 text-sm text-red-400">{teamFormError}</p> : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Released
            </p>
            <p className="text-2xl font-semibold text-white">
              {game.challenges.filter((challenge) => challenge.is_released).length}/
              {game.challenges.length || 0}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Latest GPS
            </p>
            <p className="text-2xl font-semibold text-white">{game.latestLocations.length}</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Recent Activity
            </p>
            <p className="text-2xl font-semibold text-white">{game.recentCheckins.length}</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Leader
            </p>
            <p className="text-xl font-semibold text-white">{game.leaderboard[0]?.team_name ?? "TBD"}</p>
          </div>
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <CardHeader>
            <CardTitle className="text-2xl text-white sm:text-3xl">Check-In Map</CardTitle>
            <CardDescription className="text-white/52">
              Latest known coordinates from checkpoint GPS captures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CheckinMap latestLocations={game.latestLocations} teamRoutes={game.teamRoutes} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {game.latestLocations.length ? (
                game.latestLocations.map((location) => (
                  <div
                    key={`coord-${location.team_id}`}
                    className="rounded-[18px] border border-white/8 bg-white/[0.05] p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Badge
                        className="border-transparent text-white"
                        style={{ backgroundColor: location.color }}
                        variant="secondary"
                      >
                        {location.team_name}
                      </Badge>
                      <Badge className="border-white/10 bg-white/8 text-white/76" variant="secondary">
                        {location.label}
                      </Badge>
                    </div>
                    <p className="font-mono text-sm text-white">
                      {formatCoordinate(location.latitude)}, {formatCoordinate(location.longitude)}
                    </p>
                    <p className="mt-1 text-xs text-white/44">
                      Accuracy{" "}
                      {location.accuracy_meters !== null
                        ? `${Math.round(location.accuracy_meters)}m`
                        : "unknown"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/46">No GPS check-ins yet.</p>
              )}
            </div>
            <div className="mt-4 grid gap-3">
              {game.teamRoutes.filter((route) => route.points.length).length ? (
                game.teamRoutes
                  .filter((route) => route.points.length)
                  .map((route) => (
                    <div
                      key={`route-summary-${route.team_id}`}
                      className="rounded-[18px] border border-white/8 bg-white/[0.05] p-4"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Badge
                          className="border-transparent text-white"
                          style={{ backgroundColor: route.color }}
                          variant="secondary"
                        >
                          {route.team_name}
                        </Badge>
                        <span className="text-xs text-white/44">
                          {route.points.length} GPS checkpoint{route.points.length === 1 ? "" : "s"} mapped
                        </span>
                      </div>
                      <p className="text-sm text-white/64">
                        {route.completed_labels.join(" -> ")}
                      </p>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-white/46">Routes will appear here as teams submit GPS check-ins.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <CardHeader>
            <CardTitle className="text-2xl text-white sm:text-3xl">Recent Check-Ins</CardTitle>
            <CardDescription className="text-white/52">
              Chronological feed of the latest team checkpoint activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {game.recentCheckins.length ? (
              game.recentCheckins.slice(0, 12).map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] border border-white/8 bg-white/[0.05] p-4"
                >
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge
                          className="border-transparent text-white"
                          style={{ backgroundColor: item.color }}
                          variant="secondary"
                        >
                          {item.team_name}
                        </Badge>
                        {extractTrailingNumber(item.team_name) ? (
                          <span
                            className="inline-flex h-7 items-center rounded-full border border-white/10 px-3 text-xs font-semibold text-white/80"
                            style={{ backgroundColor: `${item.color}22` }}
                          >
                            Team {extractTrailingNumber(item.team_name)}
                          </span>
                        ) : null}
                        {item.challenge?.challenge_order ? (
                          <span
                            className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold ${challengeNumberClasses(
                              item.challenge.challenge_order
                            )}`}
                          >
                            Challenge {item.challenge.challenge_order}
                          </span>
                        ) : null}
                        <Badge variant={feedBadge(item)}>{item.status}</Badge>
                      </div>
                      <p className="font-medium text-white">
                        {item.checkpoint_label}
                      </p>
                    </div>
                    <div className="text-xs text-white/42">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/46">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {item.gps_captured_at ? "GPS captured" : "No GPS"}
                    </span>
                    {item.latitude !== null ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {formatCoordinate(item.latitude)}, {formatCoordinate(item.longitude)}
                      </span>
                    ) : null}
                  </div>
                  {item.checkin_note ? (
                    <p className="mt-3 text-sm leading-7 text-white/56">{item.checkin_note}</p>
                  ) : null}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {item.status !== "verified" ? (
                      <>
                        <Button
                          className="w-full bg-emerald-500/90 text-white hover:bg-emerald-500 sm:w-auto"
                          disabled={pendingAction === `review-checkin:${item.id}:verified`}
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              `review-checkin:${item.id}:verified`,
                              async () => {
                                await api(`/api/admin/checkins/${item.id}/review`, {
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    status: "verified",
                                    reviewNote: item.review_note ?? "",
                                  }),
                                });
                                await loadGame();
                              },
                              "Check-in approved",
                              `${item.team_name} ${item.checkpoint_label.toLowerCase()} was approved.`
                            )
                          }
                        >
                          {pendingAction === `review-checkin:${item.id}:verified` ? (
                            <>
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            "Approve"
                          )}
                        </Button>
                        <Button
                          className="w-full bg-amber-500/90 text-black hover:bg-amber-400 sm:w-auto"
                          disabled={pendingAction === `review-checkin:${item.id}:rejected`}
                          type="button"
                          onClick={() =>
                            runAdminAction(
                              `review-checkin:${item.id}:rejected`,
                              async () => {
                                await api(`/api/admin/checkins/${item.id}/review`, {
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    status: "rejected",
                                    reviewNote: item.review_note ?? "",
                                  }),
                                });
                                await loadGame();
                              },
                              "Check-in rejected",
                              `${item.team_name} ${item.checkpoint_label.toLowerCase()} was rejected.`
                            )
                          }
                        >
                          {pendingAction === `review-checkin:${item.id}:rejected` ? (
                            <>
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              Rejecting...
                            </>
                          ) : (
                            "Reject"
                          )}
                        </Button>
                      </>
                    ) : null}
                    {item.challenge ? (
                      <Button
                        className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
                        type="button"
                        variant="secondary"
                        onClick={() => setActiveRecentCheckinId(item.id)}
                      >
                        View Proof
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/46">No check-ins yet.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardHeader>
          <CardTitle className="text-2xl text-white sm:text-3xl">Challenge Control</CardTitle>
          <CardDescription className="text-white/52">
            Create the four challenge slots, then release the current queue in one action.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Card className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.04] p-4 text-white sm:p-5">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                  Create Challenge
                </p>
                <p className="text-sm text-white/52">
                  HQ creates the live challenge queue from scratch. {game.challenges.length}/{MAX_CHALLENGES} added.
                </p>
              </div>
              <Button
                className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
                disabled={
                  !game.challenges.some((challenge) => !challenge.is_released) ||
                  pendingAction === "release-all-challenges"
                }
                type="button"
                variant="secondary"
                onClick={() =>
                  runAdminAction(
                    "release-all-challenges",
                    async () => {
                      await api("/api/admin/challenges/release-all", {
                        method: "PATCH",
                      });
                      await loadGame();
                    },
                    "All challenges released",
                    "Teams can now move through the full challenge queue."
                  )
                }
              >
                {pendingAction === "release-all-challenges" ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Releasing...
                  </>
                ) : (
                  "Release All Challenges"
                )}
              </Button>
            </div>
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const formData = new FormData(form);
                await runAdminAction(
                  "create-challenge",
                  async () => {
                    await api("/api/admin/challenges", {
                      method: "POST",
                      body: JSON.stringify({
                        title: formData.get("title"),
                        text: formData.get("text"),
                        expectedLocation: formData.get("expectedLocation"),
                        allowMediaUpload: formData.get("allowMediaUpload") === "on",
                      }),
                    });
                    form.reset();
                    await loadGame();
                  },
                  "Challenge created",
                  "A new challenge was added to the Converge queue."
                );
              }}
            >
              <Input
                className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                disabled={game.challenges.length >= 5 || pendingAction === "create-challenge"}
                name="title"
                placeholder="Challenge title"
                required
              />
              <Input
                className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                disabled={game.challenges.length >= 5 || pendingAction === "create-challenge"}
                name="expectedLocation"
                placeholder="Expected checkpoint location"
                required
              />
              <Textarea
                className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                disabled={game.challenges.length >= MAX_CHALLENGES || pendingAction === "create-challenge"}
                name="text"
                placeholder="Challenge prompt"
                required
              />
              <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white">
                <input defaultChecked name="allowMediaUpload" type="checkbox" />
                Allow media upload
              </label>
              <Button
                className="w-full bg-orange-500 text-black hover:bg-orange-400 sm:w-auto"
                disabled={game.challenges.length >= MAX_CHALLENGES || pendingAction === "create-challenge"}
                type="submit"
              >
                {game.challenges.length >= MAX_CHALLENGES ? (
                  "Challenge Limit Reached"
                ) : pendingAction === "create-challenge" ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Challenge"
                )}
              </Button>
            </form>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {game.challenges.map((challenge) => {
              const checkpointTeams = game.teams
                .map((teamView) => ({
                  team: teamView.team,
                  challenge: teamView.challenges.find((item) => item.id === challenge.id) ?? null,
                }))
                .filter((entry) => entry.challenge?.checkpoint);

              return (
                <Card
                  key={challenge.id}
                  className="rounded-[24px] border border-white/8 bg-white/[0.05] p-4 text-white sm:p-5"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-bold uppercase tracking-[0.14em] ${challengeNumberClasses(
                            challenge.challenge_order
                          )}`}
                        >
                          Challenge {challenge.challenge_order}
                        </span>
                        <Badge className="border-white/10 bg-white/5 text-white/74" variant="secondary">
                          {challengeKindLabel(challenge)}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-semibold text-white">{challenge.title}</h3>
                      <p className="mt-2 text-xs text-white/52">
                        Submission rank points: 10, 8, 4, 2, then 0.
                      </p>
                    </div>
                    <Badge variant={challenge.is_released ? "success" : "warning"}>
                      {challenge.is_released ? "Released" : "Hidden"}
                    </Badge>
                  </div>

                  <form
                    className="space-y-3"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      await runAdminAction(
                        `save-challenge:${challenge.id}`,
                        async () => {
                          await api(`/api/admin/challenges/${challenge.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({
                              title: formData.get("title"),
                              text: formData.get("text"),
                              expectedLocation: formData.get("expectedLocation"),
                              allowMediaUpload: formData.get("allowMediaUpload") === "on",
                              teamPrompts:
                                challenge.kind === "game_long"
                                  ? game.teams.map((teamView) => ({
                                      teamId: teamView.team.id,
                                      promptText: formData.get(`teamPrompt:${teamView.team.id}`),
                                    }))
                                  : [],
                              checkpoints:
                                challenge.kind === "checkpoint"
                                  ? checkpointTeams.map(({ team }) => ({
                                      teamId: team.id,
                                      checkpointLabel: formData.get(`checkpointLabel:${team.id}`),
                                      checkpointAddress: formData.get(`checkpointAddress:${team.id}`),
                                      latitude: formData.get(`checkpointLatitude:${team.id}`),
                                      longitude: formData.get(`checkpointLongitude:${team.id}`),
                                      unlockRadiusMeters: DEFAULT_CHECKPOINT_UNLOCK_RADIUS_METERS,
                                    }))
                                  : [],
                            }),
                          });
                          await loadGame();
                        },
                        "Challenge saved",
                        `Challenge ${challenge.challenge_order} was updated.`
                      );
                    }}
                  >
                    <Input
                      className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                      defaultValue={challenge.title}
                      name="title"
                    />
                    <Textarea
                      className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                      defaultValue={challenge.text}
                      name="text"
                    />
                    {challenge.kind === "game_long" ? (
                      <div className="rounded-[20px] border border-white/8 bg-white/[0.04] p-4">
                        <p className="text-sm font-semibold text-white">Team prompts</p>
                        <p className="mt-1 text-xs text-white/48">
                          Only Challenge 1 uses team-specific prompt text. Blank stays blank for that team.
                        </p>
                        <div className="mt-4 grid gap-3">
                          {game.teams.map((teamView) => {
                            const teamPrompt =
                              challenge.team_prompts?.find(
                                (entry) => entry.team_id === teamView.team.id
                              )?.prompt_text ?? "";

                            return (
                              <div
                                key={`${challenge.id}-prompt-${teamView.team.id}`}
                                className="rounded-[18px] border border-white/8 bg-black/10 p-3"
                              >
                                <p className="mb-3 text-sm font-semibold text-white">
                                  {teamView.team.team_name}
                                </p>
                                <Textarea
                                  className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                                  defaultValue={teamPrompt}
                                  name={`teamPrompt:${teamView.team.id}`}
                                  placeholder="Team-specific Challenge 1 prompt"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    {challenge.kind === "checkpoint" ? (
                      <>
                        <Input
                          className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                          defaultValue={challenge.expected_location}
                          name="expectedLocation"
                          placeholder="Checkpoint summary label"
                        />
                        <div className="rounded-[20px] border border-white/8 bg-white/[0.04] p-4">
                          <p className="text-sm font-semibold text-white">Per-team checkpoints</p>
                          <p className="mt-1 text-xs text-white/48">
                            Teams must arrive within {DEFAULT_CHECKPOINT_UNLOCK_RADIUS_METERS}m to unlock this challenge.
                          </p>
                          <div className="mt-4 grid gap-3">
                            {checkpointTeams.map(({ team, challenge: teamChallenge }) => (
                              <div
                                key={`${challenge.id}-${team.id}`}
                                className="rounded-[18px] border border-white/8 bg-black/10 p-3"
                              >
                                <p className="mb-3 text-sm font-semibold text-white">{team.team_name}</p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Input
                                    className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                                    defaultValue={teamChallenge?.checkpoint?.checkpoint_label ?? ""}
                                    name={`checkpointLabel:${team.id}`}
                                    placeholder="Checkpoint label"
                                  />
                                  <Input
                                    className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                                    defaultValue={teamChallenge?.checkpoint?.checkpoint_address ?? ""}
                                    name={`checkpointAddress:${team.id}`}
                                    placeholder="Checkpoint address"
                                  />
                                  <Input
                                    className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                                    defaultValue={formatCoordinate(teamChallenge?.checkpoint?.latitude)}
                                    name={`checkpointLatitude:${team.id}`}
                                    placeholder="Latitude"
                                  />
                                  <Input
                                    className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                                    defaultValue={formatCoordinate(teamChallenge?.checkpoint?.longitude)}
                                    name={`checkpointLongitude:${team.id}`}
                                    placeholder="Longitude"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : challenge.kind === "union" ? (
                      <div className="rounded-[20px] border border-white/8 bg-white/[0.04] p-4">
                        <p className="text-sm font-semibold text-white">Union checkpoint</p>
                        <p className="mt-1 text-sm text-white/58">{UNION_STATION.finishPoint}</p>
                        <input name="expectedLocation" type="hidden" value={UNION_STATION.name} />
                      </div>
                    ) : (
                      <div className="rounded-[20px] border border-white/8 bg-white/[0.04] p-4">
                        <p className="text-sm font-semibold text-white">Game-long challenge</p>
                        <p className="mt-1 text-sm text-white/58">
                          This unlocks right after the start check-in and stays open for the full race.
                        </p>
                        <input name="expectedLocation" type="hidden" value="" />
                      </div>
                    )}
                    <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white">
                      <input
                        defaultChecked={Boolean(challenge.allow_media_upload)}
                        name="allowMediaUpload"
                        type="checkbox"
                      />
                      Allow media upload
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <Button
                        className="w-full bg-orange-500 text-black hover:bg-orange-400 sm:w-auto"
                        type="submit"
                      >
                        {pendingAction === `save-challenge:${challenge.id}` ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Challenge"
                        )}
                      </Button>
                      <Button
                        className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
                        disabled={pendingAction === `toggle-release:${challenge.id}`}
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          void runAdminAction(
                            `toggle-release:${challenge.id}`,
                            async () => {
                              await api(`/api/admin/challenges/${challenge.id}/release`, {
                                method: "PATCH",
                                body: JSON.stringify({
                                  isReleased: !challenge.is_released,
                                }),
                              });
                              await loadGame();
                            },
                            challenge.is_released ? "Challenge hidden" : "Challenge released",
                            challenge.is_released
                              ? `Challenge ${challenge.challenge_order} was hidden from teams.`
                              : `Challenge ${challenge.challenge_order} is now live.`
                          )
                        }
                      >
                        {pendingAction === `toggle-release:${challenge.id}` ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            {challenge.is_released ? "Hiding..." : "Releasing..."}
                          </>
                        ) : challenge.is_released ? (
                          "Hide Challenge"
                        ) : (
                          "Release Challenge"
                        )}
                      </Button>
                      <Button
                        className="w-full border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20 sm:w-auto"
                        disabled={pendingAction === `delete-challenge:${challenge.id}`}
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Delete Challenge ${challenge.challenge_order}? This permanently removes its submissions, uploads, reviews, and challenge check-ins.`
                          );
                          if (!confirmed) return;

                          void runAdminAction(
                            `delete-challenge:${challenge.id}`,
                            async () => {
                              await api(`/api/admin/challenges/${challenge.id}`, {
                                method: "DELETE",
                              });
                              await loadGame();
                            },
                            "Challenge deleted",
                            `Challenge ${challenge.challenge_order} was permanently removed.`
                          );
                        }}
                      >
                        {pendingAction === `delete-challenge:${challenge.id}` ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Delete Challenge"
                        )}
                      </Button>
                    </div>
                  </form>
                </Card>
              );
            })}
          </div>
          {!game.challenges.length ? (
            <p className="text-sm text-white/46">
              No challenges created yet. Add the first live prompt above.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {activeRecentCheckin ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-[#120f10] text-white shadow-[0_24px_80px_rgba(0,0,0,0.44)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                  Challenge Proof
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {activeRecentCheckin.challenge?.challenge_order}. {activeRecentCheckin.challenge?.title}
                </h3>
                <p className="mt-1 text-sm text-white/54">{activeRecentCheckin.team_name}</p>
              </div>
              <Button
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                type="button"
                variant="secondary"
                onClick={() => setActiveRecentCheckinId(null)}
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>

            <div className="grid max-h-[calc(92vh-80px)] gap-5 overflow-y-auto p-5 sm:p-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                  {activeRecentCheckin.uploads.length ? (
                    <>
                      <div className="overflow-hidden rounded-[20px] border border-white/8 bg-black/20">
                        {activeRecentCheckin.uploads[activeProofIndex]?.media_type === "video" ? (
                          <video
                            className="h-[240px] w-full bg-black object-contain sm:h-[360px]"
                            controls
                            playsInline
                            preload="none"
                            src={activeRecentCheckin.uploads[activeProofIndex]?.signed_url}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={activeRecentCheckin.uploads[activeProofIndex]?.file_name ?? "Proof upload"}
                            className="h-[240px] w-full object-cover sm:h-[360px]"
                            decoding="async"
                            src={activeRecentCheckin.uploads[activeProofIndex]?.signed_url}
                          />
                        )}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {activeRecentCheckin.uploads.map((upload, index) => (
                          <button
                            key={upload.id}
                            className={`rounded-[16px] border p-2 text-left transition ${
                              index === activeProofIndex
                                ? "border-orange-400/30 bg-white/[0.08]"
                                : "border-white/8 bg-white/[0.03]"
                            }`}
                            type="button"
                            onClick={() => setActiveProofIndex(index)}
                          >
                            <div className="mb-2 flex items-center gap-2">
                              {upload.media_type === "video" ? (
                                <Video className="h-4 w-4 text-white/70" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-white/70" />
                              )}
                              <span className="truncate text-sm text-white/78">{upload.file_name}</span>
                            </div>
                            <p className="text-xs text-white/42">
                              {new Date(upload.uploaded_at).toLocaleString()}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-white/52">
                      No media uploaded yet for this challenge.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">
                    Challenge Info
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/64">
                    {activeRecentCheckin.challenge?.text}
                  </p>
                  <p className="mt-4 text-sm text-white/74">
                    <span className="text-white/44">Expected location:</span>{" "}
                    {activeRecentCheckin.challenge?.expected_location}
                  </p>
                  <p className="mt-2 text-sm text-white/74">
                    <span className="text-white/44">Check-in:</span>{" "}
                    {new Date(activeRecentCheckin.created_at).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-white/74">
                    <span className="text-white/44">GPS:</span>{" "}
                    {activeRecentCheckin.latitude !== null
                      ? `${formatCoordinate(activeRecentCheckin.latitude)}, ${formatCoordinate(activeRecentCheckin.longitude)}`
                      : "No GPS"}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-300">
                    Team Proof Note
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/64">
                    {activeRecentCheckin.proof_note || "No proof note submitted yet."}
                  </p>
                  {activeRecentCheckin.checkin_note ? (
                    <>
                      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-orange-300">
                        Check-In Note
                      </p>
                      <p className="mt-3 text-sm leading-7 text-white/64">
                        {activeRecentCheckin.checkin_note}
                      </p>
                    </>
                  ) : null}
                </div>

                {activeRecentCheckin.uploads[activeProofIndex] ? (
                  <a
                    className="inline-flex items-center gap-2 text-sm text-orange-200 hover:text-orange-100"
                    href={activeRecentCheckin.uploads[activeProofIndex].signed_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open original file
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardHeader>
          <CardTitle className="text-2xl text-white sm:text-3xl">Team Review</CardTitle>
          <CardDescription className="text-white/52">
            Review checkpoints, proof notes, and uploaded media. Scoring is automatic.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {game.teams.map((teamView) => (
            <Card
              key={teamView.team.id}
              className="rounded-[24px] border border-white/8 bg-white/[0.05] p-4 text-white sm:p-5"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge
                      className="border-transparent text-white"
                      style={{ backgroundColor: teamView.team.color }}
                      variant="secondary"
                    >
                      {teamView.team.badge_label}
                    </Badge>
                    <Badge className="border-white/10 bg-white/8 text-white/82" variant="secondary">
                      #{teamView.teamStats.leaderboard_rank} · {teamView.teamStats.total_points} pts
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold text-white">{teamView.team.team_name}</h3>
                  <p className="text-sm leading-7 text-white/54">{teamView.team.route_summary}</p>
                </div>
              </div>

              <form
                className="mb-5 grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.04] p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  await runAdminAction(
                    `save-credentials:${teamView.team.id}`,
                    async () => {
                      const response = await api<{ game?: AdminGameResponse }>(
                        `/api/admin/teams/${teamView.team.id}/credentials`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            teamName: formData.get("teamName"),
                            pin: formData.get("pin"),
                          }),
                        }
                      );
                      if (response.game) {
                        setGame(response.game);
                      } else {
                        await loadGame();
                      }
                    },
                    "Team access updated",
                    `${teamView.team.team_name} login details were updated.`
                  );
                }}
              >
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.14em] text-white/46">
                    Team name
                  </label>
                  <Input
                    className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                    defaultValue={teamView.adminAccess?.display_name ?? teamView.team.team_name}
                    name="teamName"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.14em] text-white/46">
                    Team PIN
                  </label>
                  <Input
                    className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                    defaultValue={teamView.adminAccess?.pin ?? ""}
                    name="pin"
                    required
                    type="text"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full bg-orange-500 text-black hover:bg-orange-400 lg:w-auto"
                    type="submit"
                  >
                    {pendingAction === `save-credentials:${teamView.team.id}` ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Team Access"
                    )}
                  </Button>
                </div>
              </form>

              <div className="mb-5 rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Checkpoint checklist</p>
                    <p className="text-xs text-white/42">
                      Latest location: {teamView.latestLocation ? teamView.latestLocation.label : "No GPS yet"}
                    </p>
                  </div>
                  <p className="text-xs text-white/48">
                    {teamView.checkpoints.every((checkpoint) => checkpoint.status === "verified")
                      ? "All checkpoints verified"
                      : `Next checkpoint in review: ${
                          teamView.checkpoints.find(
                            (checkpoint) =>
                              checkpoint.key === openCheckpointByTeam[teamView.team.id]
                          )?.label ?? "Pending"
                        }`}
                  </p>
                </div>
                <div className="grid gap-2">
                  {teamView.checkpoints.map((checkpoint) => {
                    const badge = checkpointBadge(checkpoint);
                    const isOpen = openCheckpointByTeam[teamView.team.id] === checkpoint.key;
                    return (
                      <div
                        key={checkpoint.key}
                        className={`rounded-[18px] border p-3 transition ${
                          isOpen
                            ? "border-orange-400/26 bg-white/[0.06] shadow-[0_0_0_1px_rgba(245,158,11,0.06)]"
                            : "border-white/6 bg-transparent"
                        }`}
                      >
                        <button
                          className="flex w-full items-start justify-between gap-3 px-1 text-left"
                          type="button"
                          onClick={() =>
                            setOpenCheckpointByTeam((current) => ({
                              ...current,
                              [teamView.team.id]: current[teamView.team.id] === checkpoint.key ? null : checkpoint.key,
                            }))
                          }
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {checkpoint.checkin_type === "challenge" && checkpoint.challenge_id ? (
                                <span
                                  className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-semibold ${challengeNumberClasses(
                                    extractTrailingNumber(checkpoint.label)
                                  )}`}
                                >
                                  Challenge {extractTrailingNumber(checkpoint.label)}
                                </span>
                              ) : null}
                              <p className="font-medium text-white">{checkpoint.label}</p>
                            </div>
                            <p className="text-xs text-white/42">{checkpoint.description}</p>
                            <p className="mt-2 text-xs text-white/68">
                              Expected location: {checkpoint.expected_location_label}
                            </p>
                            {checkpoint.expected_location_description ? (
                              <p className="text-[11px] text-white/40">
                                {checkpoint.expected_location_description}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/44">
                              {checkpoint.latest_checkin ? (
                                <>
                                  <span>
                                    {new Date(checkpoint.latest_checkin.created_at).toLocaleString()}
                                  </span>
                                  {checkpoint.latest_checkin.latitude !== null ? (
                                    <span className="inline-flex items-center gap-1">
                                      <MapPin className="h-3.5 w-3.5" />
                                      {formatCoordinate(checkpoint.latest_checkin.latitude)},{" "}
                                      {formatCoordinate(checkpoint.latest_checkin.longitude)}
                                    </span>
                                  ) : (
                                    <span>No GPS</span>
                                  )}
                                </>
                              ) : (
                                <span>No check-in submitted yet.</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                            <ChevronDown
                              className={`mt-0.5 h-4 w-4 shrink-0 text-white/52 transition ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </button>
                        {checkpoint.expected_location_description ? (
                          <div className="px-1 pb-3 pt-1">
                            <button
                              className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-medium text-white/64 transition hover:bg-white/[0.08] hover:text-white"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                const address = checkpoint.expected_location_description;
                                if (!address) return;
                                void copyAddress(address);
                              }}
                            >
                              <Copy className="h-3 w-3 shrink-0" />
                              Copy address
                            </button>
                          </div>
                        ) : null}
                        {isOpen ? (
                          <div className="mt-4 border-t border-white/8 px-1 pt-4">
                            {checkpoint.latest_checkin ? (
                              <form
                                className="space-y-3"
                                onSubmit={async (event) => {
                                  event.preventDefault();
                                  const formData = new FormData(event.currentTarget);
                                  const nextStatus = String(formData.get("status") ?? "pending") as
                                    | "pending"
                                    | "verified"
                                    | "rejected";

                                  await runAdminAction(
                                    `save-checkin:${checkpoint.latest_checkin?.id}`,
                                    async () => {
                                      await api(`/api/admin/checkins/${checkpoint.latest_checkin?.id}/review`, {
                                        method: "PATCH",
                                        body: JSON.stringify({
                                          status: nextStatus,
                                          reviewNote: formData.get("reviewNote"),
                                        }),
                                      });

                                      const nextGame = await loadGame();
                                      if (nextStatus === "verified") {
                                        const nextTeam = nextGame.teams.find(
                                          (candidate) => candidate.team.id === teamView.team.id
                                        );
                                        setOpenCheckpointByTeam((current) => ({
                                          ...current,
                                          [teamView.team.id]: nextTeam
                                            ? getNextOpenCheckpointKey(nextTeam.checkpoints, checkpoint.key)
                                            : null,
                                        }));
                                      }
                                    },
                                    "Check-in reviewed",
                                    `${teamView.team.team_name} ${checkpoint.label.toLowerCase()} was updated.`
                                  );
                                }}
                              >
                                {checkpoint.latest_checkin.checkin_note ? (
                                  <p className="text-sm leading-7 text-white/56">
                                    {checkpoint.latest_checkin.checkin_note}
                                  </p>
                                ) : null}
                                <select
                                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                                  defaultValue={checkpoint.latest_checkin.status}
                                  name="status"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="verified">Verified</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                                <Textarea
                                  className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                                  defaultValue={checkpoint.latest_checkin.review_note}
                                  name="reviewNote"
                                  placeholder="Leave an HQ note for this checkpoint."
                                />
                                <Button
                                  className="w-full bg-orange-500 text-black hover:bg-orange-400 sm:w-auto"
                                  type="submit"
                                >
                                  {pendingAction === `save-checkin:${checkpoint.latest_checkin?.id}` ? (
                                    <>
                                      <LoaderCircle className="h-4 w-4 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    "Save Check-In Review"
                                  )}
                                </Button>
                              </form>
                            ) : (
                              <p className="text-sm text-white/44">
                                No check-in submitted yet. This stays next in line until the team reaches it.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-5 rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm text-white/56">
                Scoring is automatic: challenge points are awarded as soon as a submission is pending. If HQ rejects it later, those points are removed.
              </div>

              <div className="space-y-4">
                {teamView.challenges.length ? (
                  teamView.challenges.map((challenge) => {
                    const latestUploadAt = challenge.uploads[0]?.uploaded_at;
                    const badge = reviewBadge(challenge);

                    return (
                      <div
                        key={challenge.id}
                        className="rounded-2xl border border-white/8 bg-white/[0.06] p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold ${challengeNumberClasses(
                                  challenge.challenge_order
                                )}`}
                              >
                                Challenge {challenge.challenge_order}
                              </span>
                              <strong className="text-white">{challenge.title}</strong>
                            </div>
                            <p className="mt-1 text-xs text-white/50">
                              Expected location: {challenge.expected_location}
                            </p>
                            <p className="mt-1 text-xs text-white/44">
                              {challenge.uploads.length} file{challenge.uploads.length === 1 ? "" : "s"}
                              {latestUploadAt
                                ? ` · latest ${new Date(latestUploadAt).toLocaleString()}`
                                : " · no media yet"}
                            </p>
                            <p className="mt-1 text-xs text-white/52">
                              {challenge.review_status === "rejected"
                                ? "Rejected submissions lose their points."
                                : `${challenge.awarded_points} pts currently awarded`}
                            </p>
                          </div>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>

                        <p className="mb-3 text-sm leading-7 text-white/56">
                          {challenge.text || "No prompt text assigned."}
                        </p>

                        <p className="mb-3 text-sm leading-7 text-white/56">
                          {challenge.proof_note || "No proof note submitted."}
                        </p>

                        {challenge.uploads.length ? (
                          <div className="mb-4 grid gap-3 sm:grid-cols-2">
                            {challenge.uploads.map((upload) => (
                              <div
                                key={upload.id}
                                className="overflow-hidden rounded-[18px] border border-white/8 bg-black/20"
                              >
                                <div className="aspect-[4/3] bg-black/30">
                                  {upload.media_type === "image" ? (
                                    <button
                                      className="h-full w-full"
                                      type="button"
                                      onClick={() => setLightboxUrl(upload.signed_url)}
                                    >
                                      <img
                                        alt={upload.file_name}
                                        className="h-full w-full object-cover transition hover:opacity-80"
                                        decoding="async"
                                        loading="lazy"
                                        src={upload.signed_url}
                                      />
                                    </button>
                                  ) : (
                                    <video
                                      className="h-full w-full object-cover"
                                      controls
                                      playsInline
                                      preload="none"
                                      src={upload.signed_url}
                                    />
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-3 p-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-white">{upload.file_name}</p>
                                    <p className="text-xs text-white/42">
                                      {Math.max(1, Math.round(upload.file_size_bytes / 1024 / 1024))}MB
                                    </p>
                                  </div>
                                  {upload.media_type === "image" ? (
                                    <button
                                      className="text-white/40 transition hover:text-white/80"
                                      title="View fullscreen"
                                      type="button"
                                      onClick={() => setLightboxUrl(upload.signed_url)}
                                    >
                                      <ImageIcon className="h-4 w-4 shrink-0" />
                                    </button>
                                  ) : (
                                    <Video className="h-4 w-4 shrink-0 text-white/40" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <form
                          className="space-y-3"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            const formData = new FormData(event.currentTarget);
                            await runAdminAction(
                              `save-review:${teamView.team.id}:${challenge.id}`,
                              async () => {
                                await api(
                                  `/api/admin/teams/${teamView.team.id}/challenges/${challenge.id}/review`,
                                  {
                                    method: "PATCH",
                                    body: JSON.stringify({
                                      reviewStatus: formData.get("reviewStatus"),
                                      reviewNote: formData.get("reviewNote"),
                                    }),
                                  }
                                );
                                await loadGame();
                              },
                              "Challenge review saved",
                              `${teamView.team.team_name} challenge ${challenge.challenge_order} review was updated.`
                            );
                          }}
                        >
                          <select
                            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                            defaultValue={challenge.review_status}
                            name="reviewStatus"
                          >
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <Textarea
                            className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                            defaultValue={challenge.review_note}
                            name="reviewNote"
                            placeholder="Leave an HQ note for the team if proof needs changes."
                          />
                          <Button className="w-full bg-orange-500 text-black hover:bg-orange-400 sm:w-auto" type="submit">
                            {pendingAction === `save-review:${teamView.team.id}:${challenge.id}` ? (
                              <>
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Challenge Review"
                            )}
                          </Button>
                        </form>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-white/46">No released challenges for this team yet.</p>
                )}
              </div>
            </Card>
          ))}
        </CardContent>
      </Card>
    </main>

    {/* Lightbox */}
    {lightboxUrl ? (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/92 p-4"
        onClick={() => setLightboxUrl(null)}
      >
        <button
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          type="button"
          onClick={() => setLightboxUrl(null)}
        >
          <X className="h-5 w-5" />
        </button>
        <img
          alt="Full size proof"
          className="max-h-full max-w-full rounded-[12px] object-contain shadow-2xl"
          src={lightboxUrl}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    ) : null}

    {/* Change Credentials Modal */}
    {showCredentials ? (
      <div
        className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 p-4"
        onClick={() => setShowCredentials(false)}
      >
        <div
          className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#1a1518] p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">Account</p>
              <h2 className="mt-1 font-serif text-2xl text-white">Change Credentials</h2>
            </div>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/6 text-white/60 hover:bg-white/12 hover:text-white"
              type="button"
              onClick={() => setShowCredentials(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form className="space-y-4" onSubmit={(e) => void onUpdateCredentials(e)}>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                Current PIN
              </label>
              <Input
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-orange-400/40"
                placeholder="Enter your current PIN to verify"
                required
                type="password"
                value={credCurrentPin}
                onChange={(e) => setCredCurrentPin(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                New Username
              </label>
              <Input
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-orange-400/40"
                placeholder="Admin display name"
                required
                type="text"
                value={credNewName}
                onChange={(e) => setCredNewName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                New PIN
              </label>
              <Input
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-orange-400/40"
                placeholder="New PIN or password"
                required
                type="password"
                value={credNewPin}
                onChange={(e) => setCredNewPin(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                Confirm New PIN
              </label>
              <Input
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-orange-400/40"
                placeholder="Re-enter new PIN"
                required
                type="password"
                value={credConfirmPin}
                onChange={(e) => setCredConfirmPin(e.target.value)}
              />
            </div>

            {credError ? (
              <p className="rounded-[12px] bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
                {credError}
              </p>
            ) : null}

            <div className="flex gap-3 pt-1">
              <Button
                className="flex-1 border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                type="button"
                variant="secondary"
                onClick={() => setShowCredentials(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-orange-500 text-white hover:bg-orange-400"
                disabled={pendingAction === "credentials"}
                type="submit"
              >
                {pendingAction === "credentials" ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    ) : null}
    </>
  );
}
