"use client";

import { useEffect, useMemo, useState } from "react";

function getNextSaturdayAtSeven() {
  const now = new Date();
  const next = new Date(now);
  const day = now.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  next.setDate(now.getDate() + daysUntilSaturday);
  next.setHours(19, 0, 0, 0);
  return next;
}

function getRemainingParts(target: Date) {
  const diff = Math.max(target.getTime() - Date.now(), 0);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

export function CountdownTimer() {
  const target = useMemo(() => getNextSaturdayAtSeven(), []);
  const [remaining, setRemaining] = useState(() => getRemainingParts(target));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(getRemainingParts(target));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [target]);

  const units = [
    { label: "Days", value: remaining.days },
    { label: "Hours", value: remaining.hours },
    { label: "Minutes", value: remaining.minutes },
    { label: "Seconds", value: remaining.seconds },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="rounded-2xl border border-white/8 bg-black/18 px-3 py-4 text-center backdrop-blur-sm"
        >
          <div className="text-2xl font-semibold text-white/96 sm:text-3xl">
            {String(unit.value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/32 sm:text-xs">
            {unit.label}
          </div>
        </div>
      ))}
    </div>
  );
}
