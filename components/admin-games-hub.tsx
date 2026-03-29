"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { GameSummary } from "@/lib/game";

type Props = {
  initialGames: GameSummary[];
};

export function AdminGamesHub({ initialGames }: Props) {
  const router = useRouter();
  const games = initialGames;
  const [showForm, setShowForm] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [finishPointLabel, setFinishPointLabel] = useState("");
  const [finishShortName, setFinishShortName] = useState("");
  const [finishLatitude, setFinishLatitude] = useState("");
  const [finishLongitude, setFinishLongitude] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEmpty = games.length === 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const latParsed = finishLatitude.trim() === "" ? null : Number(finishLatitude);
      const lngParsed = finishLongitude.trim() === "" ? null : Number(finishLongitude);
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          name: name.trim(),
          adminDisplayName: adminDisplayName.trim(),
          adminPin: adminPin.trim(),
          ...(finishPointLabel.trim()
            ? { finishPointLabel: finishPointLabel.trim() }
            : {}),
          ...(finishShortName.trim() ? { finishShortName: finishShortName.trim() } : {}),
          ...(latParsed !== null && Number.isFinite(latParsed) ? { finishLatitude: latParsed } : {}),
          ...(lngParsed !== null && Number.isFinite(lngParsed) ? { finishLongitude: lngParsed } : {}),
        }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        slug?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not create event.");
        return;
      }
      if (data.slug) {
        router.push(`/e/${data.slug}/admin`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-8 px-4 py-10">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-pixel text-lg uppercase text-foreground">HQ events</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Open an existing event or create a new game.
            </p>
          </div>
          <Button asChild type="button" variant="ghost" size="sm" className="text-muted-foreground">
            <Link href="/">Home</Link>
          </Button>
        </div>

        {isEmpty && !showForm ? (
          <Card className="border-2 border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-pixel text-base uppercase">No events yet</CardTitle>
              <CardDescription>
                Create a game to get a URL, HQ credentials, and the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="font-pixel uppercase" type="button" onClick={() => setShowForm(true)}>
                Create game
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!isEmpty ? (
          <Card className="border-2 border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-pixel text-base uppercase">All games</CardTitle>
              <CardDescription>Sign in to HQ for the event you are running.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="space-y-2">
                {games.map((g) => (
                  <li key={g.id}>
                    <Link
                      className="flex flex-col rounded-md border border-border bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/50"
                      href={`/e/${g.slug}/admin`}
                    >
                      <span className="font-medium text-foreground">{g.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">/e/{g.slug}/admin</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {!showForm ? (
                <Button
                  className="mt-4 font-pixel uppercase"
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(true)}
                >
                  Create new game
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {showForm ? (
        <Card className="border-2 border-foreground bg-card">
          <CardHeader>
            <CardTitle className="font-pixel text-lg uppercase">Create your event</CardTitle>
            <CardDescription>
              Set the public URL, event title, and HQ credentials. Add teams and challenges from the
              dashboard after you sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="slug">
                  Event URL (slug)
                </label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="shrink-0">/e/</span>
                  <Input
                    id="slug"
                    className="font-mono text-sm"
                    autoComplete="off"
                    placeholder="my-race-2026"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="name">
                  Event display name
                </label>
                <Input
                  id="name"
                  placeholder="Spring city challenge"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="adminName">
                  Admin display name
                </label>
                <Input
                  id="adminName"
                  placeholder="HQ"
                  value={adminDisplayName}
                  onChange={(e) => setAdminDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="adminPin">
                  Admin PIN
                </label>
                <Input
                  id="adminPin"
                  type="password"
                  autoComplete="new-password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground">Finish line (optional)</p>
                <p className="text-xs text-muted-foreground/90">
                  Defaults to the downtown reference finish if you skip this. You can change it anytime
                  in HQ.
                </p>
                <Input
                  className="text-sm"
                  placeholder="Address or description"
                  value={finishPointLabel}
                  onChange={(e) => setFinishPointLabel(e.target.value)}
                />
                <Input
                  className="text-sm"
                  placeholder="Short label for maps"
                  value={finishShortName}
                  onChange={(e) => setFinishShortName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    className="font-mono text-sm"
                    inputMode="decimal"
                    placeholder="Latitude"
                    value={finishLatitude}
                    onChange={(e) => setFinishLatitude(e.target.value)}
                  />
                  <Input
                    className="font-mono text-sm"
                    inputMode="decimal"
                    placeholder="Longitude"
                    value={finishLongitude}
                    onChange={(e) => setFinishLongitude(e.target.value)}
                  />
                </div>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button className="font-pixel uppercase" disabled={loading} type="submit">
                  {loading ? "Creating…" : "Create & open HQ"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
