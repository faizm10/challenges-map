"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type HostMode = "signup" | "login";

export function HostClient({
  mode,
  nextPath,
}: {
  mode: HostMode;
  nextPath: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";
  const endpoint = useMemo(
    () => (isSignup ? "/api/auth/organizer/signup" : "/api/auth/organizer/login"),
    [isSignup]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Unable to continue.");
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Unable to connect right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col lg:flex-row">
      <div
        className="relative flex min-h-[40vh] flex-col justify-between p-8 lg:min-h-screen lg:w-[58%] lg:p-14"
        style={{
          backgroundImage:
            "url('/images/landing/u1194229659_generate_a_pixel_gamified_toronto_landscape_pictu_208a8505-04d8-407f-a202-6ea78d2f3571_3.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#090809]/68 via-[#090809]/30 to-[#090809]/84" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#090809]/62 lg:to-[#090809]" />

        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.35em] text-orange-500">Converge</p>
        </div>

        <div className="relative z-10 space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-orange-400">Host Setup</p>
          <h1 className="text-4xl leading-tight text-[#e6d5b8] sm:text-5xl lg:text-6xl">
            Build
            <br />
            the race.
          </h1>
          <p className="max-w-xs text-sm leading-6 text-[#e6d5b8]/55">
            Create or access your organizer credentials, then continue to event creation.
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center bg-[#090809] px-8 py-14 lg:px-14">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="flex gap-2">
            <Button
              asChild
              className="flex-1"
              variant={isSignup ? "default" : "secondary"}
            >
              <Link href={`/host?mode=signup&next=${encodeURIComponent(nextPath)}`}>Sign up</Link>
            </Button>
            <Button
              asChild
              className="flex-1"
              variant={isSignup ? "secondary" : "default"}
            >
              <Link href={`/host?mode=login&next=${encodeURIComponent(nextPath)}`}>Sign in</Link>
            </Button>
          </div>

          <div className="space-y-1 border-l-2 border-orange-500 pl-4">
            <p className="text-xs uppercase tracking-[0.25em] text-orange-500">
              {isSignup ? "Organizer Sign Up" : "Organizer Log In"}
            </p>
            <h2 className="text-3xl text-[#e6d5b8]">
              {isSignup ? "Create access" : "Welcome back"}
            </h2>
            <p className="text-xs text-[#e6d5b8]/42">
              Uses access credentials table for organizer access.
            </p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-widest text-[#e6d5b8]/45">
                Organizer Name
              </label>
              <Input
                className="border border-[#e6d5b8]/12 bg-[#e6d5b8]/4 text-[#e6d5b8] placeholder:text-[#e6d5b8]/22 focus:border-orange-500 focus:ring-0"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Faiz & Adelynn"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-widest text-[#e6d5b8]/45">
                PIN
              </label>
              <Input
                className="border border-[#e6d5b8]/12 bg-[#e6d5b8]/4 tracking-widest text-[#e6d5b8] placeholder:text-[#e6d5b8]/22 focus:border-orange-500 focus:ring-0"
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="••••••"
                required
              />
            </div>

            {error ? (
              <div className="border-l-2 border-red-500 bg-red-500/8 px-3 py-2">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            ) : null}

            <Button
              className="w-full border border-orange-500 bg-orange-500 text-black hover:bg-orange-400 hover:border-orange-400 disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Working...
                </span>
              ) : isSignup ? (
                "Continue to create event"
              ) : (
                "Continue"
              )}
            </Button>

            <Button asChild className="w-full" type="button" variant="secondary">
              <Link href="/">Cancel</Link>
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
