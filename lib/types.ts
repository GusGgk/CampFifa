export const PLAYERS = ["Gk", "Edu", "Gritten", "Dosan"] as const;
export type Player = (typeof PLAYERS)[number];

export type Match = {
  id: number;
  date: string; // YYYY-MM-DD
  location: string;
  teamA: string[];
  teamB: string[];
  scoreA: number;
  scoreB: number;
  createdAt: string;
};

export type NewMatch = Omit<Match, "id" | "createdAt">;
