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
    <div className="relative overflow-hidden border-3 border-foreground bg-gb-lightest p-4 shadow-[4px_4px_0px_0px_var(--foreground)]">
      <div className="relative z-10 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        {/* Map area */}
        <div className="relative min-h-[360px] overflow-hidden border-2 border-foreground bg-background">
          {/* Pixel grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" />

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
                strokeOpacity="0.7"
                strokeWidth="0.8"
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
                className="absolute -ml-2 -mt-2 h-4 w-4 border-2 border-foreground"
                style={{ backgroundColor: team.color }}
                transition={{
                  duration: 5.8 + index * 0.45,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  repeatType: "loop",
                }}
              />
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                className="absolute -translate-x-1/2 -translate-y-1/2 font-pixel text-[7px] uppercase text-foreground"
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

          {/* Union finish point */}
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${unionPoint.x}%`, top: `${unionPoint.y}%` }}
            transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY }}
          >
            <div className="flex h-16 w-16 items-center justify-center border-2 border-foreground bg-secondary text-center">
              <div>
                <div className="font-pixel text-[6px] uppercase text-secondary-foreground">
                  Finish
                </div>
                <div className="font-pixel text-[8px] text-secondary-foreground mt-1">Union</div>
              </div>
            </div>
          </motion.div>

          {/* Info box */}
          <div className="absolute bottom-3 left-3 border-2 border-foreground bg-card px-3 py-2">
            <div className="font-pixel text-[7px] uppercase text-muted-foreground">
              Toronto race grid
            </div>
            <div className="mt-1 text-xs text-foreground">
              5 origins. 1 convergence.
            </div>
          </div>
        </div>

        {/* Leaderboard sidebar */}
        <div className="space-y-2">
          {leaderboard.map((team, index) => (
            <motion.div
              key={team.id}
              className="border-2 border-foreground bg-card p-3"
              initial={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              viewport={{ once: true, amount: 0.35 }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="border border-foreground bg-gb-lightest px-2 py-0.5 font-pixel text-[8px] uppercase text-foreground">
                      #{team.leaderboard_rank}
                    </span>
                    <span
                      className="h-3 w-3 border border-foreground"
                      style={{ backgroundColor: team.color }}
                    />
                  </div>
                  <h3 className="font-pixel text-[10px] uppercase text-foreground">{team.team_name}</h3>
                  <p className="text-xs text-muted-foreground">{team.start_location_name}</p>
                </div>
                <div className="text-right">
                  <div className="font-pixel text-sm text-foreground">{team.total_points}</div>
                  <div className="font-pixel text-[7px] uppercase text-muted-foreground">
                    pts
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-2 border border-foreground bg-gb-lightest">
                <motion.div
                  className="h-full"
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
