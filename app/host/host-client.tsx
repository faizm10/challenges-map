"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Mode = "signup" | "login";

export function HostClient({
  nextPath,
  initialMode,
}: {
  nextPath: string;
  initialMode: Mode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
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
      const endpoint =
        mode === "signup" ? "/api/auth/organizer/signup" : "/api/auth/organizer/login";
      const body =
        mode === "signup" ? { email, password, displayName } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(
          data.error ??
            (mode === "signup" ? "Could not create account." : "Could not log in.")
        );
        return;
      }

      router.push(nextPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <Card className="border-2 border-foreground bg-card">
        <CardHeader>
          {mode === "login" ? (
            <p className="font-pixel text-[10px] uppercase tracking-wider text-[#ff7a00]">
              Registration
            </p>
          ) : null}
          <CardTitle className="font-pixel text-lg uppercase">
            {mode === "signup" ? "Organizer sign up" : "HQ access"}
          </CardTitle>
          <CardDescription>
            {mode === "signup"
              ? "Create your account first. Then choose your event URL, add teams, and build challenges."
              : "Admin credentials only. No public access."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="host-email">
                {mode === "signup" ? "Email" : "Admin email"}
              </label>
              <Input
                id="host-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="host-password">
                {mode === "signup" ? "Password" : "PIN / Password"}
              </label>
              <Input
                id="host-password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 8 characters" : ""}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 8 : undefined}
              />
            </div>

            {mode === "signup" ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="host-name">
                  Display name (shown as default HQ name)
                </label>
                <Input
                  id="host-name"
                  autoComplete="name"
                  placeholder="Alex / Team Ops"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                className={`font-pixel uppercase ${
                  mode === "login"
                    ? "w-full border border-[#ff7a00] bg-[#ff7a00] text-[#1a130f] hover:bg-[#ff8f24]"
                    : ""
                }`}
                disabled={loading}
                type="submit"
              >
                {loading
                  ? mode === "signup"
                    ? "Creating account..."
                    : "Signing in..."
                  : mode === "signup"
                    ? "Continue to create event"
                    : "Register & enter HQ"}
              </Button>
              <Button asChild type="button" variant="secondary">
                <Link href="/">Cancel</Link>
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => {
                  setMode(mode === "signup" ? "login" : "signup");
                  setError("");
                }}
              >
                {mode === "signup" ? "Log in" : "Sign up"}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
