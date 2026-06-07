export default function RankingSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden" aria-busy="true" aria-label="Cargando ranking">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-border/30 last:border-0">
          <div className="h-4 w-5 rounded bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse flex-1" />
          <div className="h-4 w-8 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}
