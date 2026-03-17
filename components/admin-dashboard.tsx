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
        <Card className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              HQ Admin
            </p>
            <h1 className="max-w-[10ch] font-serif text-5xl leading-none sm:text-6xl">
              Control the chaos.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              HQ unlocks the control room with the admin name and PIN from
              Supabase, edits the challenge pack, releases tasks one by one, and
              scores each team.
            </p>
            <Button asChild variant="secondary">
              <Link href="/">Back to Leaderboard</Link>
            </Button>
          </div>

          <Card className="rounded-[24px] bg-white/90 p-5">
            <CardHeader className="p-0">
              <CardTitle className="text-2xl">Admin PIN</CardTitle>
              <CardDescription>Hardcoded for v1. HQ only.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-5">
              <form className="space-y-4" onSubmit={onLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin name</label>
                  <Input
                    type="text"
                    value={adminName}
                    onChange={(event) => setAdminName(event.target.value)}
                    placeholder="HQ Admin"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Enter admin PIN</label>
                  <Input
                    type="password"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="UNIONHQ2026"
                    required
                  />
                </div>
                <Button className="w-full" type="submit">
                  Unlock HQ Dashboard
                </Button>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
              </form>
            </CardContent>
          </Card>
        </Card>
      </main>
    );
  }

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-7 md:px-6 md:py-8">
      <Card className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              HQ Dashboard
            </p>
            <h1 className="font-serif text-4xl">Release challenges, review proof, score teams.</h1>
            <p className="max-w-3xl text-muted-foreground">
              All changes write directly to the shared SQLite state and show up on
              team dashboards plus the public leaderboard after polling.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/">Leaderboard</Link>
            </Button>
            <Button
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
            <Button variant="ghost" onClick={onLogout}>
              Log Out
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] bg-white/70 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Released
            </p>
            <p className="text-2xl font-semibold">
              {game.challenges.filter((challenge) => challenge.is_released).length}/5
            </p>
          </div>
          <div className="rounded-[24px] bg-white/70 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Leader
            </p>
            <p className="text-2xl font-semibold">
              {game.leaderboard[0]?.team_name ?? "TBD"}
            </p>
          </div>
          <div className="rounded-[24px] bg-white/70 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Team Pins
            </p>
            <p className="text-2xl font-semibold">{game.pins.team_pin_count}</p>
          </div>
          <div className="rounded-[24px] bg-white/70 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Finish
            </p>
            <p className="text-xl font-semibold">Union Front Street</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Challenge Control</CardTitle>
          <CardDescription>Edit the five prompts and release them one by one.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {game.challenges.map((challenge) => (
            <Card key={challenge.id} className="rounded-[24px] border border-border/80 bg-white/75 p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Challenge {challenge.challenge_order}
                  </p>
                  <h3 className="text-xl font-semibold">{challenge.title}</h3>
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
                <Input name="title" defaultValue={challenge.title} />
                <Textarea name="text" defaultValue={challenge.text} />
                <div className="flex flex-wrap gap-3">
                  <Button type="submit">Save Challenge</Button>
                  <Button
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

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Team Review and Scoring</CardTitle>
          <CardDescription>Review proof notes, assign arrival ranks, and award creativity points.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {game.teams.map((teamView) => (
            <Card key={teamView.team.id} className="rounded-[24px] border border-border/80 bg-white/75 p-5">
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
                    <Badge variant="secondary">
                      #{teamView.teamStats.leaderboard_rank} · {teamView.teamStats.total_points} pts
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold">{teamView.team.team_name}</h3>
                  <p className="text-sm text-muted-foreground">{teamView.team.route_summary}</p>
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
                  className="h-11 rounded-2xl border border-border bg-white/90 px-4 text-sm"
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
                  min={0}
                  max={20}
                  name="creativityScore"
                  type="number"
                  defaultValue={teamView.teamStats.creativity_score}
                />
                <Button type="submit">Save Score</Button>
              </form>

              <div className="space-y-3">
                {teamView.challenges.length ? (
                  teamView.challenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="rounded-2xl border border-border/80 bg-white/80 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <strong>
                          {challenge.challenge_order}. {challenge.title}
                        </strong>
                        <Badge variant={challenge.status === "submitted" ? "success" : "warning"}>
                          {challenge.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {challenge.proof_note || "No proof note submitted."}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No released challenges for this team yet.</p>
                )}
              </div>
            </Card>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
