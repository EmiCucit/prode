import RankingSkeleton from "@/components/organisms/RankingSkeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="h-7 w-20 rounded bg-muted animate-pulse" />
      <RankingSkeleton />
    </main>
  );
}
