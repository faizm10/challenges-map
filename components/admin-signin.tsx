"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminSignin({ gameSlug }: { gameSlug: string }) {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameSlug, name: adminName, pin }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to log in.");
        return;
      }

      router.push(`/e/${gameSlug}/admin`);
      router.refresh();
    } catch {
      setError("Unable to connect right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col lg:flex-row">
      <style>{`
        @keyframes reg-fadein { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes reg-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .reg-form { animation: reg-fadein 0.5s ease forwards; }
        .reg-dot { animation: reg-blink 1.4s step-end infinite; }
      `}</style>

      <div
        className="relative flex min-h-[40vh] flex-col justify-between p-8 lg:min-h-screen lg:w-[58%] lg:p-14"
        style={{
          backgroundImage:
            "url('/images/landing/u1194229659_generate_a_pixel_gamified_toronto_landscape_pictu_eacc8824-0c44-43d2-a4cf-3af8d79357b3_0.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#090809]/70 via-[#090809]/30 to-[#090809]/85" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#090809]/60 lg:to-[#090809]" />

        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.35em] text-orange-500">Converge</p>
        </div>

        <div className="relative z-10 space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-orange-400">HQ Command</p>
          <h1 className="text-4xl leading-tight text-[#e6d5b8] sm:text-5xl lg:text-6xl">
            Control
            <br />
            the chaos.
          </h1>
          <p className="max-w-xs text-sm leading-6 text-[#e6d5b8]/55">
            Release challenges, verify check-ins, review media, and keep the Converge leaderboard
            accurate in real time.
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center bg-[#090809] px-8 py-14 lg:px-14">
        <div className="absolute right-6 top-6 flex items-center gap-2">
          <span className="reg-dot inline-block h-2 w-2 bg-orange-500" />
          <span className="text-xs uppercase tracking-widest text-[#e6d5b8]/25">Restricted</span>
        </div>

        <div className="reg-form w-full max-w-[360px] space-y-8">
          <div className="space-y-1 border-l-2 border-orange-500 pl-4">
            <p className="text-xs uppercase tracking-[0.25em] text-orange-500">Registration</p>
            <h2 className="text-3xl text-[#e6d5b8]">HQ Access</h2>
            <p className="text-xs text-[#e6d5b8]/40">Admin credentials only. No public access.</p>
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
                  Verifying...
                </span>
              ) : (
                "Register & Enter HQ"
              )}
            </Button>

            <Button asChild className="w-full" type="button" variant="secondary">
              <Link href="/">Cancel</Link>
            </Button>
          </form>

          <p className="text-center text-xs uppercase tracking-wider text-[#e6d5b8]/18">
            Converge — HQ access only
          </p>
        </div>
      </div>
    </main>
  );
}
