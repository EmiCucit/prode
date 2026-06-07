import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import FilterBar from "@/components/molecules/FilterBar";
import FixtureList from "@/components/organisms/FixtureList";
import FixtureListSkeleton from "@/components/organisms/FixtureListSkeleton";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export const metadata = { title: "Partidos" };

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const filters = {
    status: str(sp["status"]),
    date:   str(sp["date"]),
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
      <h1 className="text-xl font-bold text-foreground">Partidos</h1>
      <FilterBar />
      {/* key forces Suspense to re-show skeleton when filters change */}
      <Suspense key={JSON.stringify(filters)} fallback={<FixtureListSkeleton />}>
        <FixtureList filters={filters} />
      </Suspense>
    </main>
  );
}
