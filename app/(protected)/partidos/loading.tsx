import FixtureListSkeleton from "@/components/organisms/FixtureListSkeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
      <div className="h-7 w-24 rounded bg-muted animate-pulse" />
      <div className="space-y-2">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 w-24 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
        <div className="flex gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-7 w-28 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
      </div>
      <FixtureListSkeleton />
    </main>
  );
}
