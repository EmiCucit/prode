import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { StandingsRepository } from "@/lib/data/standings.repository";
import { buildRanking } from "@/lib/domain/ranking";
import RankingTable from "@/components/organisms/RankingTable";
import RankingSkeleton from "@/components/organisms/RankingSkeleton";

export const metadata = { title: "Ranking" };

async function RankingContent({ currentUserId }: { currentUserId: string }) {
  const rows    = await new StandingsRepository().getStandings();
  const players = buildRanking(rows);

  if (players.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
        El ranking se actualiza cuando terminen los partidos.
      </div>
    );
  }

  return <RankingTable players={players} currentUserId={currentUserId} />;
}

export default async function RankingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground">Ranking</h1>
      <Suspense fallback={<RankingSkeleton />}>
        <RankingContent currentUserId={session.userId} />
      </Suspense>
    </main>
  );
}
