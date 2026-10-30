import type { Metadata } from "next";
import RankingView from "@/components/views/RankingView";

export const metadata: Metadata = { title: "Ranking" };

export default function Page() {
  return <RankingView />;
}
