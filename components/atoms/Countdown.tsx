"use client";

import { useEffect, useState } from "react";

interface Props {
  cutoffAt: Date;
  onExpire?: () => void;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "";
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, "0")}m`;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function Countdown({ cutoffAt, onExpire }: Props) {
  const [remaining, setRemaining] = useState(() =>
    cutoffAt.getTime() - Date.now(),
  );

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }

    const id = setInterval(() => {
      const ms = cutoffAt.getTime() - Date.now();
      setRemaining(ms);
      if (ms <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [cutoffAt, onExpire, remaining]);

  if (remaining <= 0) return null;

  return (
    <span className="tabular-nums text-xs text-muted-foreground">
      Cierra en {formatRemaining(remaining)}
    </span>
  );
}
