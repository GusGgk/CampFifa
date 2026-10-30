import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MatchView from "@/components/views/MatchView";
import { loadData } from "@/lib/data";
import { teamLabel } from "@/lib/stats";

type Props = { params: Promise<{ id: string }> };

// Existing matches are built ahead of time; new ones are generated on first visit and then cached.
export async function generateStaticParams() {
  const { matches } = await loadData();
  return matches.map((m) => ({ id: String(m.id) }));
}

async function find(params: Props["params"]) {
  const id = Number((await params).id);
  const { matches, error } = await loadData();
  return { id, error, match: matches.find((m) => m.id === id) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { match } = await find(params);
  return { title: match ? `${teamLabel(match.teamA)} ${match.scoreA} x ${match.scoreB} ${teamLabel(match.teamB)}` : "Partida" };
}

export default async function Page({ params }: Props) {
  const { id, error, match } = await find(params);
  if (!Number.isInteger(id) || (!error && !match)) notFound();
  return <MatchView id={id} />;
}
