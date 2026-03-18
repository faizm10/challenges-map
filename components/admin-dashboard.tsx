"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ChevronDown,
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
import { Textarea } from "@/components/ui/textarea";
import type { AdminCheckinFeedItem, AdminGameResponse, TeamCheckpoint, TeamChallengeStatus } from "@/lib/types";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Request failed.");
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

export function AdminDashboard() {
  const [game, setGame] = useState<AdminGameResponse | null>(null);
  const [adminName, setAdminName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [openCheckpointByTeam, setOpenCheckpointByTeam] = useState<Record<number, string | null>>({});
  const [activeRecentCheckinId, setActiveRecentCheckinId] = useState<number | null>(null);
  const [activeProofIndex, setActiveProofIndex] = useState(0);
  const { toast } = useToast();

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
    const poll = window.setInterval(() => {
      loadGame().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(poll);
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
        body: JSON.stringify({ name: adminName, pin }),
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

  if (!game) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:py-7 md:px-6 md:py-8">
        <Card className="grid gap-6 border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.34)] lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              HQ Admin
            </p>
            <h1 className="max-w-[10ch] font-serif text-4xl leading-none text-white sm:text-6xl">
              Control the chaos.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/58">
              HQ unlocks the Converge control room, edits challenges, reviews media,
              verifies check-ins, and keeps the leaderboard moving in real time.
            </p>
            <Button
              asChild
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              variant="secondary"
            >
              <Link href="/leaderboard">Back to Leaderboard</Link>
            </Button>
          </div>

          <Card className="rounded-[28px] border-white/8 bg-white/[0.04] p-5 text-white">
            <CardHeader className="p-0">
              <CardTitle className="text-2xl text-white">HQ Unlock</CardTitle>
              <CardDescription className="text-white/48">
                Admin name and PIN only. No public access to Converge controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-5">
              <form className="space-y-4" onSubmit={onLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/72">Admin name</label>
                  <Input
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/28"
                    type="text"
                    value={adminName}
                    onChange={(event) => setAdminName(event.target.value)}
                    placeholder="HQ Admin"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/72">Enter admin PIN</label>
                  <Input
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/28"
                    type="password"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="UNIONHQ2026"
                    required
                  />
                </div>
                <Button
                  className="w-full bg-orange-500 text-black hover:bg-orange-400"
                  disabled={pendingAction === "login"}
                  type="submit"
                >
                  {pendingAction === "login" ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Unlock HQ Dashboard"
                  )}
                </Button>
                {error ? <p className="text-sm text-red-400">{error}</p> : null}
              </form>
            </CardContent>
          </Card>
        </Card>
      </main>
    );
  }

  return (
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
              <Link href="/leaderboard">Leaderboard</Link>
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
                  "Game reset",
                  "Challenges, submissions, media, and check-ins are back to the initial state."
                )
              }
            >
              Reset Game
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
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
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
                        {item.latitude.toFixed(4)}, {item.longitude?.toFixed(4)}
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
            Create up to five prompts, then release the current challenge queue in one action.
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
                  HQ creates the live challenge queue from scratch. {game.challenges.length}/5 added.
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
                disabled={game.challenges.length >= 5 || pendingAction === "create-challenge"}
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
                disabled={game.challenges.length >= 5 || pendingAction === "create-challenge"}
                type="submit"
              >
                {game.challenges.length >= 5 ? (
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
          {game.challenges.map((challenge) => (
            <Card
              key={challenge.id}
              className="rounded-[24px] border border-white/8 bg-white/[0.05] p-4 text-white sm:p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2">
                    <span
                      className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-bold uppercase tracking-[0.14em] ${challengeNumberClasses(
                        challenge.challenge_order
                      )}`}
                    >
                      Challenge {challenge.challenge_order}
                    </span>
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
                <Input
                  className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                  defaultValue={challenge.expected_location}
                  name="expectedLocation"
                  placeholder="Expected checkpoint location"
                />
                <Textarea
                  className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                  defaultValue={challenge.text}
                  name="text"
                />
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
                </div>
              </form>
            </Card>
          ))}
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
                            src={activeRecentCheckin.uploads[activeProofIndex]?.signed_url}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={activeRecentCheckin.uploads[activeProofIndex]?.file_name ?? "Proof upload"}
                            className="h-[240px] w-full object-cover sm:h-[360px]"
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
                      ? `${activeRecentCheckin.latitude.toFixed(4)}, ${activeRecentCheckin.longitude?.toFixed(4)}`
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
                                      {checkpoint.latest_checkin.latitude.toFixed(4)},{" "}
                                      {checkpoint.latest_checkin.longitude?.toFixed(4)}
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
                Scoring is automatic: challenge points are awarded only when the challenge proof review is verified.
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
                              {challenge.review_status === "verified"
                                ? `${challenge.awarded_points} pts awarded`
                                : "Points award when this challenge review is verified"}
                            </p>
                          </div>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>

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
                                    <img
                                      alt={upload.file_name}
                                      className="h-full w-full object-cover"
                                      src={upload.signed_url}
                                    />
                                  ) : (
                                    <video
                                      className="h-full w-full object-cover"
                                      controls
                                      preload="metadata"
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
                                    <ImageIcon className="h-4 w-4 shrink-0 text-white/40" />
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
  );
}
