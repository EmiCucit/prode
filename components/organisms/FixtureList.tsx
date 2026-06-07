import { getSession } from "@/lib/auth/session";
import { fetchFixtures } from "@/lib/services/fixtures.service";
import { PredictionsRepository } from "@/lib/data/predictions.repository";
import { dateKey, formatMatchDate } from "@/lib/utils";
import FixtureCard from "@/components/molecules/FixtureCard";
import type { Fixture } from "@/lib/services/fixtures.service";

const STATUS_API_MAP: Record<string, string> = {
  upcoming: "NS",
  live: "1H-HT-2H-ET-BT-P",
  finished: "FT-AET-PEN",
};

interface Filters {
  status?: string;
  date?: string;
}

function groupByDate(fixtures: Fixture[]) {
  const map = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    const k = dateKey(f.kickoffAt);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(f);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, list]) => list);
}

export default async function FixtureList({ filters }: { filters: Filters }) {
  const session = await getSession();
  if (!session) return null;

  // Map UI status to api-football status codes
  const apiStatus = filters.status ? STATUS_API_MAP[filters.status] : undefined;

  // Revalidate frequently for live matches
  const revalidate = filters.status === "live" ? 15 : 60;

  const [fixtures, predictions] = await Promise.all([
    fetchFixtures({ status: apiStatus, date: filters.date }, revalidate),
    new PredictionsRepository().findByUser(session.userId),
  ]);

  const predMap = new Map(predictions.map((p) => [p.fixture_id, p]));
  const groups = groupByDate(fixtures);

  if (fixtures.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
        No hay partidos con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((dayFixtures) => {
        const first = dayFixtures[0];
        if (!first) return null;
        return (
          <section key={dateKey(first.kickoffAt)}>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground capitalize">
              {formatMatchDate(first.kickoffAt)}
            </h2>
            <div className="space-y-3">
              {dayFixtures.map((fixture) => (
                <FixtureCard
                  key={fixture.fixtureId}
                  fixture={fixture}
                  prediction={predMap.get(fixture.fixtureId) ?? null}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
