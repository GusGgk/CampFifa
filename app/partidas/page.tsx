import type { Metadata } from "next";
import MatchesView from "@/components/views/MatchesView";

export const metadata: Metadata = { title: "Partidas" };

export default function Page() {
  return <MatchesView />;
}
