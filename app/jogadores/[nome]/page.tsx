import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlayerView from "@/components/views/PlayerView";
import { PLAYERS } from "@/lib/types";

type Props = { params: Promise<{ nome: string }> };

// The four profiles are built ahead of time; unknown names get notFound() below.
// (No `dynamicParams = false`: in Next 15 it turns these pages into 404s after revalidateTag.)
export const generateStaticParams = () => PLAYERS.map((nome) => ({ nome }));

const playerFrom = async (params: Props["params"]) => {
  const name = decodeURIComponent((await params).nome);
  return (PLAYERS as readonly string[]).includes(name) ? name : null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await playerFrom(params)) ?? "Jogador" };
}

export default async function Page({ params }: Props) {
  const name = await playerFrom(params);
  if (!name) notFound();
  return <PlayerView name={name} />;
}
