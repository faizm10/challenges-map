"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { TeamDashboardResponse } from "@/lib/types";

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

export function TeamDashboard() {
  const [dashboard, setDashboard] = useState<TeamDashboardResponse | null>(null);
  const [teamName, setTeamName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadDashboard = async () => {
    const next = await api<TeamDashboardResponse>("/api/team/me");
    setDashboard(next);
  };

  useEffect(() => {
    loadDashboard().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!dashboard) return;
    const poll = window.setInterval(() => {
      loadDashboard().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(poll);
  }, [dashboard]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await api("/api/auth/team", {
        method: "POST",
        body: JSON.stringify({ name: teamName, pin }),
      });
      setTeamName("");
      setPin("");
      await loadDashboard();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to log in.");
    }
  }

  async function onLogout() {
    await api("/api/auth/logout", { method: "POST" });
    setDashboard(null);
  }

  async function onSubmitChallenge(challengeId: number, proofNote: string) {
    setSavingId(challengeId);
    try {
      await api(`/api/team/challenges/${challengeId}/submit`, {
        method: "POST",
        body: JSON.stringify({ proofNote, status: "submitted" }),
      });
      await loadDashboard();
    } finally {
      setSavingId(null);
    }
  }

  if (!dashboard) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-7 md:px-6 md:py-8">
        <Card className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Team Access
            </p>
            <h1 className="max-w-[10ch] font-serif text-5xl leading-none sm:text-6xl">
              Your route. Your challenge queue.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              Enter the team name and PIN stored in Supabase to unlock only your
              dashboard, released challenges, proof-note submission, and live standings.
            </p>
            <Button asChild variant="secondary">
              <Link href="/">Back to Leaderboard</Link>
            </Button>
          </div>

          <Card className="rounded-[24px] bg-white/90 p-5">
            <CardHeader className="p-0">
              <CardTitle className="text-2xl">Team PIN</CardTitle>
              <CardDescription>Hardcoded for v1. One PIN unlocks one team.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-5">
              <form className="space-y-4" onSubmit={onLogin}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team name</label>
                  <Input
                    type="text"
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="Team 1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Enter team PIN</label>
                  <Input
                    type="password"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="TEAM1GO"
                    required
                  />
                </div>
                <Button className="w-full" type="submit">
                  Unlock Team Dashboard
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
    <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-7 md:px-6 md:py-8">
      <Card className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{dashboard.team.badge_label}</Badge>
              <Badge variant="secondary">{dashboard.team.start_location_name}</Badge>
            </div>
            <h1 className="font-serif text-4xl">{dashboard.team.team_name}</h1>
            <p className="max-w-3xl text-muted-foreground">{dashboard.team.route_summary}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/">Leaderboard</Link>
            </Button>
            <Button variant="ghost" onClick={onLogout}>
              Log Out
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] bg-white/70 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Walk Time
            </p>
            <p className="text-2xl font-semibold">{dashboard.team.walk_time}</p>
          </div>
          <div className="rounded-[24px] bg-white/70 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Rank
            </p>
            <p className="text-2xl font-semibold">#{dashboard.teamStats.leaderboard_rank}</p>
          </div>
          <div className="rounded-[24px] bg-white/70 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Challenge Points
            </p>
            <p className="text-2xl font-semibold">{dashboard.teamStats.challenge_points}</p>
          </div>
          <div className="rounded-[24px] bg-white/70 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Total
            </p>
            <p className="text-2xl font-semibold">{dashboard.teamStats.total_points}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Released Challenges</CardTitle>
          <CardDescription>
            Teams can only submit proof notes for challenges HQ has already released.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {dashboard.challenges.length ? (
            dashboard.challenges.map((challenge) => (
              <Card
                key={challenge.id}
                className="rounded-[24px] border border-border/80 bg-white/75 p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                      Challenge {challenge.challenge_order}
                    </p>
                    <h3 className="text-xl font-semibold">{challenge.title}</h3>
                  </div>
                  <Badge variant={challenge.status === "submitted" ? "success" : "warning"}>
                    {challenge.status === "submitted" ? "Submitted" : "Not started"}
                  </Badge>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">{challenge.text}</p>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    onSubmitChallenge(challenge.id, String(formData.get("proofNote") ?? ""));
                  }}
                >
                  <Textarea
                    name="proofNote"
                    defaultValue={challenge.proof_note}
                    placeholder="Paste a proof note or external video/photo link for HQ."
                  />
                  <Button disabled={savingId === challenge.id} type="submit">
                    {savingId === challenge.id ? "Saving..." : "Submit / Update"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {challenge.submitted_at
                      ? `Last submitted ${new Date(challenge.submitted_at).toLocaleString()}`
                      : "No proof submitted yet."}
                  </p>
                </form>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              HQ has not released any challenges yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Live Leaderboard</CardTitle>
          <CardDescription>Public standings update every few seconds.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Challenges</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Creativity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.leaderboard.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-semibold">{entry.team_name}</TableCell>
                  <TableCell>#{entry.leaderboard_rank}</TableCell>
                  <TableCell>{entry.total_points}</TableCell>
                  <TableCell>{entry.completed_count}/5</TableCell>
                  <TableCell>{entry.speed_points}</TableCell>
                  <TableCell>{entry.creativity_score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
