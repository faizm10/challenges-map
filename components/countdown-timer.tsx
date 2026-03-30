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
    { label: "Hrs", value: remaining.hours },
    { label: "Min", value: remaining.minutes },
    { label: "Sec", value: remaining.seconds },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="border-2 border-foreground bg-gb-lightest px-2 py-3 text-center shadow-[2px_2px_0px_0px_var(--foreground)]"
        >
          <div className="font-pixel text-lg text-foreground sm:text-xl">
            {String(unit.value).padStart(2, "0")}
          </div>
          <div className="mt-1 font-pixel text-[7px] uppercase text-muted-foreground">
            {unit.label}
          </div>
        </div>
      ))}
    </div>
  );
}
