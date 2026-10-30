import Dashboard from "@/components/Dashboard";
import { listMatches } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  let matches: Awaited<ReturnType<typeof listMatches>> = [];
  let error: string | null = null;
  try {
    matches = await listMatches();
  } catch (e) {
    error = e instanceof Error ? e.message : "Erro ao carregar partidas";
  }
  return <Dashboard initialMatches={matches} loadError={error} />;
}
