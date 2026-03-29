"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SignupClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/organizer/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create account.");
        return;
      }
      router.push(nextPath as any);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <Card className="border-2 border-foreground bg-card">
        <CardHeader>
          <CardTitle className="font-pixel text-lg uppercase">Organizer sign up</CardTitle>
          <CardDescription>
            Create your account first. You will then choose your event URL and HQ PIN, add teams, and
            build challenges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="su-email">
                Email
              </label>
              <Input
                id="su-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="su-password">
                Password
              </label>
              <Input
                id="su-password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="su-name">
                Display name (shown as default HQ name)
              </label>
              <Input
                id="su-name"
                autoComplete="name"
                placeholder="Alex / Team Ops"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button className="font-pixel uppercase" disabled={loading} type="submit">
                {loading ? "Creating account…" : "Continue to create event"}
              </Button>
              <Button asChild type="button" variant="secondary">
                <Link href="/">Cancel</Link>
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link className="underline underline-offset-4" href={`/organizer/login?next=${encodeURIComponent(nextPath)}`}>
                Log in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
