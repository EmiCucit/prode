import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { StandingsRepository } from "@/lib/data/standings.repository";
import { PredictionsRepository } from "@/lib/data/predictions.repository";
import { ResultsRepository } from "@/lib/data/results.repository";
import { buildRanking } from "@/lib/domain/ranking";
import { buildBreakdowns, latestFinishedResult } from "@/lib/domain/breakdown";
import RankingTable from "@/components/organisms/RankingTable";
import RankingSkeleton from "@/components/organisms/RankingSkeleton";

export const metadata = { title: "Ranking" };

async function RankingContent({ currentUserId }: { currentUserId: string }) {
  const [rows, predictions, results] = await Promise.all([
    new StandingsRepository().getStandings(),
    new PredictionsRepository().findAll(),
    new ResultsRepository().findAll(),
  ]);

  const players = buildRanking(rows);

  if (players.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
        El ranking se actualiza cuando terminen los partidos.
      </div>
    );
  }

  // Predicciones por usuario en partidos finalizados (para el desplegable).
  const breakdowns = buildBreakdowns(predictions, results);
  // Hasta qué partido están calculados los puntos.
  const lastResult = latestFinishedResult(results);

  return (
    <>
      {lastResult && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Último resultado calculado:{" "}
          <span className="font-medium text-foreground">{lastResult.home_team_name}</span>{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {lastResult.home_score}–{lastResult.away_score}
          </span>{" "}
          <span className="font-medium text-foreground">{lastResult.away_team_name}</span>
        </p>
      )}
      <RankingTable
        players={players}
        currentUserId={currentUserId}
        breakdowns={breakdowns}
      />
    </>
  );
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
