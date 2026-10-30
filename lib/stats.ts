import { PLAYERS, type Match } from "./types";

export type Outcome = "V" | "E" | "D";

export type PlayerStats = {
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  diff: number;
  winRate: number; // 0..1
  gfAvg: number;
  gaAvg: number;
  cleanSheets: number;
  form: Outcome[]; // last 5, oldest first
  streak: { type: Outcome; count: number } | null;
};

export const chrono = (matches: Match[]) =>
  [...matches].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

export const isSolo = (m: Match) => m.teamA.length === 1 && m.teamB.length === 1;

export function sideOf(m: Match, player: string): "A" | "B" | null {
  if (m.teamA.includes(player)) return "A";
  if (m.teamB.includes(player)) return "B";
  return null;
}

export function outcome(m: Match, player: string): Outcome | null {
  const side = sideOf(m, player);
  if (!side) return null;
  const [mine, theirs] = side === "A" ? [m.scoreA, m.scoreB] : [m.scoreB, m.scoreA];
  return mine > theirs ? "V" : mine < theirs ? "D" : "E";
}

export function goals(m: Match, player: string) {
  const side = sideOf(m, player);
  if (!side) return null;
  return side === "A" ? { gf: m.scoreA, ga: m.scoreB } : { gf: m.scoreB, ga: m.scoreA };
}

export function playerStats(matches: Match[], name: string): PlayerStats {
  const mine = chrono(matches).filter((m) => sideOf(m, name));
  const results = mine.map((m) => outcome(m, name)!);
  let gf = 0;
  let ga = 0;
  let cleanSheets = 0;
  for (const m of mine) {
    const g = goals(m, name)!;
    gf += g.gf;
    ga += g.ga;
    if (g.ga === 0) cleanSheets++;
  }
  const wins = results.filter((r) => r === "V").length;
  const draws = results.filter((r) => r === "E").length;
  const played = mine.length;

  let streak: PlayerStats["streak"] = null;
  if (results.length) {
    const last = results[results.length - 1];
    let count = 0;
    for (let i = results.length - 1; i >= 0 && results[i] === last; i--) count++;
    streak = { type: last, count };
  }

  return {
    name,
    played,
    wins,
    draws,
    losses: played - wins - draws,
    gf,
    ga,
    diff: gf - ga,
    winRate: played ? wins / played : 0,
    gfAvg: played ? gf / played : 0,
    gaAvg: played ? ga / played : 0,
    cleanSheets,
    form: results.slice(-5),
    streak,
  };
}

export const allStats = (matches: Match[]) => PLAYERS.map((p) => playerStats(matches, p));

export type Mode = "all" | "solo" | "duo";

export const filterByMode = (matches: Match[], mode: Mode) =>
  matches.filter((m) => mode === "all" || (mode === "solo" ? isSolo(m) : !isSolo(m)));

/** Standings order: win rate, then goal difference, then games played. */
export const rankPlayers = (stats: PlayerStats[]) =>
  [...stats].sort((a, b) => b.winRate - a.winRate || b.diff - a.diff || b.played - a.played);

export type RankedStats = PlayerStats & { pos: number; delta: number; points: number };

/** Standings plus how many places each player moved since the previous match day. */
export function standings(matches: Match[]): RankedStats[] {
  const now = rankPlayers(allStats(matches));
  const sorted = chrono(matches);
  const lastDay = sorted[sorted.length - 1]?.date;
  const prev = rankPlayers(allStats(sorted.filter((m) => m.date !== lastDay)));
  return now.map((s, i) => ({
    ...s,
    pos: i + 1,
    delta: lastDay ? prev.findIndex((p) => p.name === s.name) - i : 0,
    points: s.wins * 3 + s.draws,
  }));
}

/** Longest run of wins in a player's history. */
export function bestWinStreak(matches: Match[], player: string) {
  let best = 0;
  let cur = 0;
  for (const m of chrono(matches)) {
    const r = outcome(m, player);
    if (!r) continue;
    cur = r === "V" ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

/** Matches where a and b were on opposite sides. Counts from a's point of view. */
export function headToHead(matches: Match[], a: string, b: string) {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  for (const m of matches) {
    const sa = sideOf(m, a);
    const sb = sideOf(m, b);
    if (!sa || !sb || sa === sb) continue;
    const r = outcome(m, a);
    if (r === "V") wins++;
    else if (r === "E") draws++;
    else losses++;
  }
  return { wins, draws, losses, played: wins + draws + losses };
}

export type DuoStats = { players: [string, string]; played: number; wins: number; winRate: number };

export function duoStats(matches: Match[]): DuoStats[] {
  const out: DuoStats[] = [];
  for (let i = 0; i < PLAYERS.length; i++) {
    for (let j = i + 1; j < PLAYERS.length; j++) {
      const pair: [string, string] = [PLAYERS[i], PLAYERS[j]];
      const together = matches.filter((m) => {
        const s = sideOf(m, pair[0]);
        return s && s === sideOf(m, pair[1]);
      });
      const wins = together.filter((m) => outcome(m, pair[0]) === "V").length;
      out.push({ players: pair, played: together.length, wins, winRate: together.length ? wins / together.length : 0 });
    }
  }
  return out.filter((d) => d.played > 0).sort((a, b) => b.winRate - a.winRate || b.played - a.played);
}

export function locationStats(matches: Match[]) {
  const map = new Map<string, { name: string; played: number; goals: number }>();
  for (const m of matches) {
    const name = m.location || "Sem local";
    const cur = map.get(name) ?? { name, played: 0, goals: 0 };
    cur.played++;
    cur.goals += m.scoreA + m.scoreB;
    map.set(name, cur);
  }
  return [...map.values()].sort((a, b) => b.played - a.played);
}

/** Win rate of each player after each match, in chronological order. */
export function winRateTimeline(matches: Match[]) {
  const tally = Object.fromEntries(PLAYERS.map((p) => [p, { w: 0, n: 0 }]));
  return chrono(matches).map((m) => {
    const rates: Record<string, number | null> = {};
    for (const p of PLAYERS) {
      const r = outcome(m, p);
      if (r) {
        tally[p].n++;
        if (r === "V") tally[p].w++;
      }
      rates[p] = tally[p].n ? tally[p].w / tally[p].n : null;
    }
    return { date: m.date, rates };
  });
}

export const teamLabel = (team: string[]) => team.join(" & ");

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", opts).replace(".", "");
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;
