import type { Metadata } from "next";
import PlayersView from "@/components/views/PlayersView";

export const metadata: Metadata = { title: "Jogadores" };

export default function Page() {
  return <PlayersView />;
}
