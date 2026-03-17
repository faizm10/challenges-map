"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Users, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const teamThemes = [
  { name: "Street Heat", color: "bg-orange-500" },
  { name: "Waterfront Blur", color: "bg-cyan-400" },
  { name: "Midnight Dash", color: "bg-fuchsia-500" },
  { name: "Downtown Gold", color: "bg-amber-400" },
  { name: "Neon North", color: "bg-lime-400" },
];

export function CreateRaceModal() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);

  return (
    <>
      <Button
        className="h-12 rounded-full bg-orange-500 px-6 text-sm font-semibold text-black hover:bg-orange-400"
        onClick={() => setOpen(true)}
      >
        Start a Race
      </Button>

      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          >
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="w-full max-w-4xl"
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="overflow-hidden border-white/10 bg-[#0b0b0d]/95 p-0 text-white">
                <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="border-b border-white/10 bg-gradient-to-br from-orange-500/18 via-transparent to-white/5 p-6 lg:border-b-0 lg:border-r">
                    <div className="mb-8 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                          Create a Race
                        </p>
                        <h3 className="mt-2 font-serif text-3xl">
                          Launch a city-wide walking game.
                        </h3>
                      </div>
                      <button
                        className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                        onClick={() => setOpen(false)}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
                          <Users className="h-4 w-4 text-orange-300" />
                          Team theme preview
                        </div>
                        <div className="grid gap-3">
                          {teamThemes.map((team, index) => (
                            <button
                              key={team.name}
                              className={cn(
                                "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                                selected === index
                                  ? "border-orange-400 bg-orange-500/12"
                                  : "border-white/10 bg-white/5 hover:bg-white/8"
                              )}
                              onClick={() => setSelected(index)}
                              type="button"
                            >
                              <div className="flex items-center gap-3">
                                <span className={cn("h-3 w-3 rounded-full", team.color)} />
                                <span className="font-medium">{team.name}</span>
                              </div>
                              <Badge
                                className="border-transparent bg-white/10 text-white"
                                variant="secondary"
                              >
                                Team {index + 1}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm text-white/70">
                          <Sparkles className="h-4 w-4 text-orange-300" />
                          HQ launch mode
                        </div>
                        <p className="text-sm text-white/60">
                          Live prompts, rotating challenge drops, and one dramatic
                          final convergence at Union Station.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-white/70">Race name</label>
                        <Input
                          className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                          placeholder="Friday Night Union Run"
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <label className="text-sm font-medium text-white/70">City</label>
                          <Input
                            className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                            placeholder="Toronto"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-medium text-white/70">Team count</label>
                          <Input
                            className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                            placeholder="5"
                          />
                        </div>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-transparent p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                          Race Preview
                        </p>
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <span className="text-white/60">Starting points</span>
                            <strong>5 across Toronto</strong>
                          </div>
                          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <span className="text-white/60">Challenge cadence</span>
                            <strong>Manual HQ drops</strong>
                          </div>
                          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <span className="text-white/60">Finish line</span>
                            <strong>Union Station</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button className="h-12 rounded-full bg-orange-500 px-6 text-black hover:bg-orange-400">
                          Create Draft Race
                        </Button>
                        <Button
                          className="h-12 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                          onClick={() => setOpen(false)}
                          variant="secondary"
                        >
                          Close Preview
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
