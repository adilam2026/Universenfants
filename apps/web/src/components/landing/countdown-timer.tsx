"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

function timeLeft(endAt: string) {
  const diff = Math.max(0, new Date(endAt).getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, ended: diff <= 0 };
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-lg bg-white/15 px-2.5 py-1.5 text-lg font-extrabold tabular-nums text-white min-w-[2.5rem] text-center">
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-[10px] font-bold text-white/80 mt-0.5 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export function CountdownTimer({ endAt, label }: { endAt: string; label?: string }) {
  const [left, setLeft] = useState(() => timeLeft(endAt));

  useEffect(() => {
    const id = setInterval(() => setLeft(timeLeft(endAt)), 1000);
    return () => clearInterval(id);
  }, [endAt]);

  if (left.ended) return null;

  return (
    <div
      className="flex flex-col items-center gap-2 py-3 px-4 text-center"
      style={{ background: "var(--lp-primary)" }}
    >
      <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
        <Flame className="size-4" /> {label ?? "Offre spéciale"}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold text-white/90">Se termine dans :</span>
        <div className="flex gap-1">
          {left.days > 0 && <Digit value={left.days} label="j" />}
          <Digit value={left.hours} label="h" />
          <Digit value={left.minutes} label="m" />
          <Digit value={left.seconds} label="s" />
        </div>
      </div>
    </div>
  );
}
