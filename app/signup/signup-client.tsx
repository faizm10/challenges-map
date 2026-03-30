"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignupClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/organizer/signup", {
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
        <div className="absolute inset-0 bg-gradient-to-b from-[#08131d]/70 via-[#08131d]/34 to-[#08131d]/88" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#08131d]/65 lg:to-[#08131d]" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.35em] text-[#7dd3fc]">Converge</p>
        </div>
        <div className="relative z-10 space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-[#38bdf8]">Host Setup</p>
          <h1 className="text-4xl leading-tight text-[#e0f2fe] sm:text-5xl lg:text-6xl">
            Build
            <br />
            the race.
          </h1>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center bg-[#08131d] px-8 py-14 lg:px-14">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="space-y-1 border-l-2 border-[#38bdf8] pl-4">
            <p className="text-xs uppercase tracking-[0.25em] text-[#38bdf8]">Organizer Sign Up</p>
            <h2 className="text-3xl text-[#e0f2fe]">Create access</h2>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-widest text-[#bae6fd]/70">
                Organizer Name
              </label>
              <Input
                className="border border-[#7dd3fc]/30 bg-[#0b1d2b] text-[#e0f2fe] placeholder:text-[#7dd3fc]/40 focus:border-[#38bdf8] focus:ring-0"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Faiz & Adelynn"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-widest text-[#bae6fd]/70">PIN</label>
              <Input
                className="border border-[#7dd3fc]/30 bg-[#0b1d2b] tracking-widest text-[#e0f2fe] placeholder:text-[#7dd3fc]/40 focus:border-[#38bdf8] focus:ring-0"
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
              className="w-full border border-[#38bdf8] bg-[#38bdf8] text-[#082f49] hover:bg-[#7dd3fc] hover:border-[#7dd3fc] disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Working...
                </span>
              ) : (
                "Continue to create event"
              )}
            </Button>
            <Button asChild className="w-full border-[#7dd3fc]/30 text-[#e0f2fe]" type="button" variant="secondary">
              <Link href="/">Cancel</Link>
            </Button>
            <p className="text-center text-sm text-[#bae6fd]/70">
              Already have an account?{" "}
              <Link className="underline underline-offset-4 hover:text-[#e0f2fe]" href="/organizer/login?next=%2Fe%2Fcreate">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
