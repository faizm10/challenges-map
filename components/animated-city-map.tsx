"use client";

import { motion } from "framer-motion";

import type { LeaderboardEntry, TeamSeed } from "@/lib/types";

type MapTeam = Pick<
  TeamSeed,
  "id" | "teamName" | "startLocationName" | "color"
> & {
  mapPosition: { x: number; y: number };
};

type AnimatedCityMapProps = {
  teams: MapTeam[];
  leaderboard: LeaderboardEntry[];
};

const unionPoint = { x: 50, y: 55 };

export function AnimatedCityMap({
  teams,
  leaderboard,
}: AnimatedCityMapProps) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#09090b] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(249,115,22,0.18),transparent_18%),radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_40%)]" />
      <div className="relative z-10 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="relative min-h-[420px] overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] opacity-35" />
          <svg
            className="absolute inset-0 h-full w-full"
            fill="none"
            viewBox="0 0 100 100"
          >
            {teams.map((team) => (
              <path
                key={`line-${team.id}`}
                d={`M ${team.mapPosition.x} ${team.mapPosition.y} Q ${(team.mapPosition.x + unionPoint.x) / 2} ${(team.mapPosition.y + unionPoint.y) / 2 - 10} ${unionPoint.x} ${unionPoint.y}`}
                stroke={team.color}
                strokeDasharray="3 3"
                strokeOpacity="0.5"
                strokeWidth="0.55"
              />
            ))}
          </svg>

          {teams.map((team, index) => (
            <div key={team.id}>
              <motion.div
                animate={{
                  left: [`${team.mapPosition.x}%`, `${unionPoint.x}%`],
                  top: [`${team.mapPosition.y}%`, `${unionPoint.y}%`],
                  scale: [1, 1.15, 0.95],
                }}
                className="absolute -ml-2.5 -mt-2.5 h-5 w-5 rounded-full border-2 border-white shadow-[0_0_24px_rgba(255,255,255,0.2)]"
                style={{ backgroundColor: team.color }}
                transition={{
                  duration: 5.8 + index * 0.45,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  repeatType: "loop",
                }}
              />
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.08, 0.9] }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70"
                style={{
                  left: `${team.mapPosition.x}%`,
                  top: `${team.mapPosition.y - 6}%`,
                }}
                transition={{
                  duration: 3.2 + index * 0.3,
                  repeat: Number.POSITIVE_INFINITY,
                }}
              >
                {team.teamName}
              </motion.div>
            </div>
          ))}

          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${unionPoint.x}%`, top: `${unionPoint.y}%` }}
            transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-orange-400/50 bg-orange-500/15 text-center shadow-[0_0_80px_rgba(249,115,22,0.3)] backdrop-blur-sm">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-orange-200/70">
                  Finish
                </div>
                <div className="mt-1 font-serif text-lg text-white">Union</div>
              </div>
            </div>
          </motion.div>

          <div className="absolute bottom-5 left-5 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-md">
            <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">
              Toronto race grid
            </div>
            <div className="mt-2 text-sm text-white/75">
              5 origin points. 1 final convergence.
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {leaderboard.map((team, index) => (
            <motion.div
              key={team.id}
              className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md"
              initial={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              viewport={{ once: true, amount: 0.35 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                      #{team.leaderboard_rank}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.badge_label}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{team.team_name}</h3>
                  <p className="text-sm text-white/50">{team.start_location_name}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-white">{team.total_points}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                    points
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2.5 rounded-full bg-white/8">
                <motion.div
                  className="h-2.5 rounded-full"
                  initial={{ width: 0 }}
                  style={{ backgroundColor: team.color }}
                  transition={{ duration: 0.9, delay: 0.2 + index * 0.08 }}
                  viewport={{ once: true }}
                  whileInView={{ width: `${Math.max(team.progress_percent, 10)}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
