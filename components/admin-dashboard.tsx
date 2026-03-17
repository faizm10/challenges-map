"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { Textarea } from "@/components/ui/textarea";
import type { AdminGameResponse } from "@/lib/types";

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

export function AdminDashboard() {
  const [game, setGame] = useState<AdminGameResponse | null>(null);
  const [adminName, setAdminName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const loadGame = async () => {
    const next = await api<AdminGameResponse>("/api/admin/game");
    setGame(next);
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

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

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
    }
  }

  async function onLogout() {
    await api("/api/auth/logout", { method: "POST" });
    setGame(null);
  }

  async function runAdminAction(
    action: () => Promise<void>,
    successTitle: string,
    successDescription?: string
  ) {
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
    }
  }

  if (!game) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-7 md:px-6 md:py-8">
        <Card className="grid gap-6 border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.34)] lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              HQ Admin
            </p>
            <h1 className="max-w-[10ch] font-serif text-5xl leading-none text-white sm:text-6xl">
              Control the chaos.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/58">
              HQ unlocks the control room, edits the challenge pack, releases prompts
              one by one, and scores each team live.
            </p>
            <Button
              asChild
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              variant="secondary"
            >
              <Link href="/">Back to Leaderboard</Link>
            </Button>
          </div>

          <Card className="rounded-[28px] border-white/8 bg-white/[0.04] p-5 text-white">
            <CardHeader className="p-0">
              <CardTitle className="text-2xl text-white">HQ Unlock</CardTitle>
              <CardDescription className="text-white/48">
                Admin name and PIN only. No public access.
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
                <Button className="w-full bg-orange-500 text-black hover:bg-orange-400" type="submit">
                  Unlock HQ Dashboard
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
    <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-7 md:px-6 md:py-8">
      <Card className="grid gap-5 border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              HQ Dashboard
            </p>
            <h1 className="font-serif text-4xl text-white">
              Release challenges, review proof, score teams.
            </h1>
            <p className="max-w-3xl text-white/56">
              All changes write to the shared game state and update team dashboards
              plus the public leaderboard after polling.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              variant="secondary"
            >
              <Link href="/">Leaderboard</Link>
            </Button>
            <Button
              className="bg-red-500/90 text-white hover:bg-red-500"
              variant="destructive"
              onClick={() =>
                runAdminAction(
                  async () => {
                    await api("/api/admin/reset", { method: "POST" });
                    await loadGame();
                  },
                  "Game reset",
                  "Challenges, submissions, and scores are back to the initial state."
                )
              }
            >
              Reset Game
            </Button>
            <Button
              className="text-white/72 hover:bg-white/6 hover:text-white"
              variant="ghost"
              onClick={onLogout}
            >
              Log Out
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Released
            </p>
            <p className="text-2xl font-semibold text-white">
              {game.challenges.filter((challenge) => challenge.is_released).length}/5
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Leader
            </p>
            <p className="text-2xl font-semibold text-white">
              {game.leaderboard[0]?.team_name ?? "TBD"}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Team Pins
            </p>
            <p className="text-2xl font-semibold text-white">{game.pins.team_pin_count}</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.06] p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
              Finish
            </p>
            <p className="text-xl font-semibold text-white">Union Front Street</p>
          </div>
        </div>
      </Card>

      <Card className="border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardHeader>
          <CardTitle className="text-3xl text-white">Challenge Control</CardTitle>
          <CardDescription className="text-white/52">
            Edit the five prompts and release them one by one.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {game.challenges.map((challenge) => (
            <Card
              key={challenge.id}
              className="rounded-[24px] border border-white/8 bg-white/[0.05] p-5 text-white"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                    Challenge {challenge.challenge_order}
                  </p>
                  <h3 className="text-xl font-semibold text-white">{challenge.title}</h3>
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
                    async () => {
                      await api(`/api/admin/challenges/${challenge.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          title: formData.get("title"),
                          text: formData.get("text"),
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
                  name="title"
                  defaultValue={challenge.title}
                />
                <Textarea
                  className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                  name="text"
                  defaultValue={challenge.text}
                />
                <div className="flex flex-wrap gap-3">
                  <Button className="bg-orange-500 text-black hover:bg-orange-400" type="submit">
                    Save Challenge
                  </Button>
                  <Button
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      runAdminAction(
                        async () => {
                          await api(`/api/admin/challenges/${challenge.id}/release`, {
                            method: "PATCH",
                            body: JSON.stringify({ isReleased: !challenge.is_released }),
                          });
                          await loadGame();
                        },
                        challenge.is_released ? "Challenge hidden" : "Challenge released",
                        `Challenge ${challenge.challenge_order} is now ${
                          challenge.is_released ? "hidden from" : "visible to"
                        } teams.`
                      )
                    }
                  >
                    {challenge.is_released ? "Hide" : "Release"}
                  </Button>
                </div>
              </form>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="border-white/8 bg-[#120f10]/88 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <CardHeader>
          <CardTitle className="text-3xl text-white">Team Review and Scoring</CardTitle>
          <CardDescription className="text-white/52">
            Review proof notes, assign arrival ranks, and award creativity points.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {game.teams.map((teamView) => (
            <Card
              key={teamView.team.id}
              className="rounded-[24px] border border-white/8 bg-white/[0.05] p-5 text-white"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge
                      variant="secondary"
                      className="border-transparent text-white"
                      style={{ backgroundColor: teamView.team.color }}
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
                className="mb-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  await runAdminAction(
                    async () => {
                      await api(`/api/admin/teams/${teamView.team.id}/score`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          arrivalRank: formData.get("arrivalRank"),
                          creativityScore: formData.get("creativityScore"),
                        }),
                      });
                      await loadGame();
                    },
                    "Score saved",
                    `${teamView.team.team_name} scoring was updated.`
                  );
                }}
              >
                <select
                  className="h-11 rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  name="arrivalRank"
                  defaultValue={teamView.teamStats.arrival_rank ?? ""}
                >
                  <option value="">No arrival rank</option>
                  <option value="1">1st</option>
                  <option value="2">2nd</option>
                  <option value="3">3rd</option>
                  <option value="4">4th</option>
                  <option value="5">5th</option>
                </select>
                <Input
                  className="border-white/10 bg-white/[0.08] text-white placeholder:text-white/35"
                  min={0}
                  max={20}
                  name="creativityScore"
                  type="number"
                  defaultValue={teamView.teamStats.creativity_score}
                />
                <Button className="bg-orange-500 text-black hover:bg-orange-400" type="submit">
                  Save Score
                </Button>
              </form>

              <div className="space-y-3">
                {teamView.challenges.length ? (
                  teamView.challenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="rounded-2xl border border-white/8 bg-white/[0.06] p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <strong className="text-white">
                          {challenge.challenge_order}. {challenge.title}
                        </strong>
                        <Badge variant={challenge.status === "submitted" ? "success" : "warning"}>
                          {challenge.status}
                        </Badge>
                      </div>
                      <p className="text-sm leading-7 text-white/56">
                        {challenge.proof_note || "No proof note submitted."}
                      </p>
                    </div>
                  ))
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
