import { cn } from "@/lib/utils";

type Status = string;

const LIVE_STATUSES = new Set(["1H", "2H", "ET", "P"]);
const BREAK_STATUSES = new Set(["HT", "BT"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

function label(status: Status, elapsed: number | null): string {
  if (LIVE_STATUSES.has(status)) return elapsed ? `${elapsed}'` : "En vivo";
  if (BREAK_STATUSES.has(status)) return "Entretiempo";
  if (status === "FT") return "Final";
  if (status === "AET") return "Final (Prórroga)";
  if (status === "PEN") return "Final (Penales)";
  if (status === "NS") return "Próximo";
  return "Suspendido";
}

export default function StatusBadge({
  status,
  elapsed = null,
}: {
  status: Status;
  elapsed?: number | null;
}) {
  const isLive = LIVE_STATUSES.has(status);
  const isBreak = BREAK_STATUSES.has(status);
  const isFinished = FINISHED_STATUSES.has(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        isLive && "bg-green-500/15 text-green-400",
        isBreak && "bg-yellow-500/15 text-yellow-400",
        isFinished && "bg-muted text-muted-foreground",
        !isLive && !isBreak && !isFinished && "bg-muted text-muted-foreground",
      )}
    >
      {isLive && (
        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
      )}
      {label(status, elapsed)}
    </span>
  );
}
