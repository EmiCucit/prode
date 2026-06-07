export default function FixtureListSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando partidos">
      {[0, 1].map((g) => (
        <div key={g} className="space-y-3">
          <div className="h-4 w-40 rounded bg-muted animate-pulse" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}
