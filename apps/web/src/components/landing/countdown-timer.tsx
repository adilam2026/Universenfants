"use client";

import { useEffect, useState } from "react";

function timeLeft(endAt: string) {
  const diff = Math.max(0, new Date(endAt).getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, ended: diff <= 0 };
}

export function CountdownTimer({ endAt }: { endAt: string }) {
  const [left, setLeft] = useState(() => timeLeft(endAt));

  useEffect(() => {
    const id = setInterval(() => setLeft(timeLeft(endAt)), 1000);
    return () => clearInterval(id);
  }, [endAt]);

  if (left.ended) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-2.5 px-4 text-white text-sm font-bold" style={{ background: "var(--lp-cta, #dc2626)" }}>
      <span>Offre se termine dans :</span>
      <span className="tabular-nums">
        {left.days > 0 && `${left.days}j `}
        {String(left.hours).padStart(2, "0")}h {String(left.minutes).padStart(2, "0")}m {String(left.seconds).padStart(2, "0")}s
      </span>
    </div>
  );
}
