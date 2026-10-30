import { PLAYERS, type Match } from "./types";
import {
  allStats,
  chrono,
  duoStats,
  formatDate,
  headToHead,
  isSolo,
  locationStats,
  pct,
  sideOf,
  teamLabel,
  type PlayerStats,
} from "./stats";

export type FactIcon =
  | "target" | "flag" | "zap" | "flame" | "crown" | "trending-up" | "trending-down" | "snowflake" | "sparkles" | "goal"
  | "medal" | "shield" | "swords" | "handshake" | "map-pin" | "party" | "brick-wall" | "shield-alert" | "chart" | "repeat"
  | "skull";

export type Fact = { icon: FactIcon; text: string };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const falta = (n: number) => (n === 1 ? "Falta" : "Faltam");
const margin = (m: Match) => Math.abs(m.scoreA - m.scoreB);
const total = (m: Match) => m.scoreA + m.scoreB;
const winnerLabel = (m: Match) => teamLabel(m.scoreA > m.scoreB ? m.teamA : m.teamB);
const scoreLine = (m: Match) => `${Math.max(m.scoreA, m.scoreB)} x ${Math.min(m.scoreA, m.scoreB)}`;

/** Chases: someone close behind someone else in goals or wins. */
function chaseFacts(stats: PlayerStats[], only?: string[]): Fact[] {
  const out: { gap: number; fact: Fact }[] = [];
  for (const behind of stats) {
    if (only && !only.includes(behind.name)) continue;
    for (const ahead of stats) {
      const goalGap = ahead.gf - behind.gf;
      if (goalGap > 0 && goalGap <= 15) {
        out.push({
          gap: goalGap,
          fact: {
            icon: "target",
            text: `${falta(goalGap)} ${plural(goalGap, "gol", "gols")} para ${behind.name} alcançar ${ahead.name} em gols marcados`,
          },
        });
      }
      const winGap = ahead.wins - behind.wins;
      if (winGap > 0 && winGap <= 3) {
        out.push({
          gap: winGap,
          fact: {
            icon: "flag",
            text: `${behind.name} está a ${plural(winGap, "vitória", "vitórias")} de empatar com ${ahead.name} no total de vitórias`,
          },
        });
      }
    }
  }
  return out.sort((a, b) => a.gap - b.gap).map((x) => x.fact);
}

function leader(stats: PlayerStats[], min = 3) {
  const eligible = stats.filter((s) => s.played >= min);
  if (!eligible.length) return null;
  return [...eligible].sort((a, b) => b.winRate - a.winRate || b.diff - a.diff)[0];
}

/** Facts triggered by a specific new match. `before` excludes it, `after` includes it. */
export function matchFacts(before: Match[], after: Match[], match: Match): Fact[] {
  const facts: Fact[] = [];
  const involved = [...match.teamA, ...match.teamB];
  const prev = allStats(before);
  const next = allStats(after);
  const byName = (list: PlayerStats[], n: string) => list.find((s) => s.name === n)!;

  if (before.length && margin(match) > Math.max(...before.map(margin))) {
    facts.push({ icon: "zap", text: `Maior goleada da história: ${winnerLabel(match)} venceu por ${scoreLine(match)}` });
  }
  if (before.length && total(match) > Math.max(...before.map(total))) {
    facts.push({ icon: "flame", text: `Jogo com mais gols de todos: ${total(match)} gols no total` });
  }

  const oldLeader = leader(prev);
  const newLeader = leader(next);
  if (newLeader && oldLeader?.name !== newLeader.name) {
    facts.push({ icon: "crown", text: `${newLeader.name} assumiu a liderança em % de vitórias (${pct(newLeader.winRate)})` });
  }

  for (const p of involved) {
    const was = byName(prev, p);
    const now = byName(next, p);
    if (now.streak && now.streak.count >= 3) {
      const word = { V: "vitórias", E: "empates", D: "derrotas" }[now.streak.type];
      facts.push({ icon: now.streak.type === "V" ? "trending-up" : "trending-down", text: `${p} chegou a ${now.streak.count} ${word} seguidas` });
    }
    if (was.streak?.type === "V" && was.streak.count >= 3 && now.streak?.type !== "V") {
      facts.push({ icon: "snowflake", text: `Fim da sequência de ${was.streak.count} vitórias de ${p}` });
    }
    if (was.streak?.type === "D" && was.streak.count >= 3 && now.streak?.type === "V") {
      facts.push({ icon: "sparkles", text: `${p} quebrou um jejum de ${was.streak.count} derrotas` });
    }
    for (const mark of [25, 50, 100, 150, 200, 300, 500]) {
      if (was.gf < mark && now.gf >= mark) facts.push({ icon: "goal", text: `${p} chegou a ${mark} gols marcados` });
    }
    if (now.played > 1 && now.played % 10 === 0) facts.push({ icon: "medal", text: `${now.played}ª partida de ${p}` });
    const conceded = sideOf(match, p) === "A" ? match.scoreB : match.scoreA;
    if (conceded === 0) {
      facts.push({ icon: "shield", text: `${p} não sofreu gols (${plural(now.cleanSheets, "jogo", "jogos")} sem sofrer na história)` });
    }
  }

  if (isSolo(match)) {
    const [a, b] = [match.teamA[0], match.teamB[0]];
    const h = headToHead(after, a, b);
    const lead = h.wins === h.losses ? null : h.wins > h.losses ? a : b;
    const [hi, lo] = [Math.max(h.wins, h.losses), Math.min(h.wins, h.losses)];
    facts.push({
      icon: "swords",
      text: lead
        ? `No confronto direto, ${lead} lidera ${hi} a ${lo}${h.draws ? ` (${plural(h.draws, "empate", "empates")})` : ""}`
        : `Confronto direto ${a} x ${b} empatado: ${h.wins} a ${h.losses}`,
    });
  } else if (match.scoreA !== match.scoreB) {
    const team = match.scoreA > match.scoreB ? match.teamA : match.teamB;
    if (team.length === 2) {
      const duo = duoStats(after).find((d) => d.players.every((p) => team.includes(p)));
      if (duo && duo.played >= 2) {
        facts.push({
          icon: "handshake",
          text: `A dupla ${teamLabel(team)} tem ${pct(duo.winRate)} de vitórias juntos (${duo.wins}/${duo.played})`,
        });
      }
    }
  }

  if (match.location) {
    const n = after.filter((m) => m.location === match.location).length;
    facts.push({ icon: "map-pin", text: n === 1 ? `Primeira partida em ${match.location}` : `${n}ª partida em ${match.location}` });
  }

  if (after.length % 25 === 0 || after.length === 10) {
    facts.push({ icon: "party", text: `Partida nº ${after.length} do campeonato!` });
  }

  // The closest goal chase and the closest win chase, one of each.
  const chases = chaseFacts(next, involved);
  for (const icon of ["target", "flag"] as const) {
    const f = chases.find((c) => c.icon === icon);
    if (f) facts.push(f);
  }
  return facts;
}

/** A pool of curiosities about the whole history, for the dashboard. */
export function generalFacts(matches: Match[]): Fact[] {
  if (!matches.length) return [];
  const facts: Fact[] = [];
  const stats = allStats(matches).filter((s) => s.played > 0);
  const sorted = chrono(matches);

  const top = leader(stats, 1);
  if (top) facts.push({ icon: "crown", text: `${top.name} lidera em aproveitamento com ${pct(top.winRate)} de vitórias` });

  const scorer = [...stats].sort((a, b) => b.gfAvg - a.gfAvg)[0];
  facts.push({ icon: "goal", text: `${scorer.name} tem o melhor ataque: ${scorer.gfAvg.toFixed(1)} gols por partida` });

  const wall = [...stats].sort((a, b) => a.gaAvg - b.gaAvg)[0];
  facts.push({ icon: "brick-wall", text: `${wall.name} tem a melhor defesa: sofre ${wall.gaAvg.toFixed(1)} gols por partida` });

  const leaky = [...stats].sort((a, b) => b.gaAvg - a.gaAvg)[0];
  if (leaky.name !== wall.name) {
    facts.push({ icon: "shield-alert", text: `${leaky.name} é o mais vazado: ${leaky.ga} gols sofridos no total` });
  }

  const biggest = [...sorted].sort((a, b) => margin(b) - margin(a))[0];
  if (margin(biggest) > 0) {
    const when = formatDate(biggest.date, { day: "2-digit", month: "short", year: "numeric" });
    facts.push({ icon: "zap", text: `Maior goleada: ${winnerLabel(biggest)} ${scoreLine(biggest)} em ${when}` });
  }

  const goals = sorted.reduce((s, m) => s + total(m), 0);
  facts.push({
    icon: "chart",
    text: `${plural(goals, "gol", "gols")} em ${plural(sorted.length, "partida", "partidas")} — média de ${(goals / sorted.length).toFixed(1)} por jogo`,
  });

  const scores = new Map<string, number>();
  for (const m of sorted) scores.set(scoreLine(m), (scores.get(scoreLine(m)) ?? 0) + 1);
  const [commonScore, commonCount] = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
  if (commonCount > 1) facts.push({ icon: "repeat", text: `O placar mais comum é ${commonScore} (${commonCount} vezes)` });

  const loc = locationStats(sorted).filter((l) => l.name !== "Sem local")[0];
  if (loc) facts.push({ icon: "map-pin", text: `${loc.name} é a casa do campeonato: ${plural(loc.played, "partida", "partidas")} jogadas lá` });

  const duo = duoStats(sorted).find((d) => d.played >= 2);
  if (duo) facts.push({ icon: "handshake", text: `Melhor dupla: ${teamLabel(duo.players)} com ${pct(duo.winRate)} de vitórias juntos` });

  for (const s of stats) {
    if (s.streak && s.streak.count >= 2 && s.streak.type !== "E") {
      facts.push({
        icon: s.streak.type === "V" ? "trending-up" : "trending-down",
        text: `${s.name} vem de ${s.streak.count} ${s.streak.type === "V" ? "vitórias" : "derrotas"} seguidas`,
      });
    }
  }

  let rivalry: { a: string; b: string; w: number; l: number } | null = null;
  for (let i = 0; i < PLAYERS.length; i++) {
    for (let j = i + 1; j < PLAYERS.length; j++) {
      const h = headToHead(sorted, PLAYERS[i], PLAYERS[j]);
      if (h.played < 3) continue;
      if (!rivalry || Math.abs(h.wins - h.losses) > Math.abs(rivalry.w - rivalry.l)) {
        rivalry = { a: PLAYERS[i], b: PLAYERS[j], w: h.wins, l: h.losses };
      }
    }
  }
  if (rivalry && rivalry.w !== rivalry.l) {
    const [dom, vic] = rivalry.w > rivalry.l ? [rivalry.a, rivalry.b] : [rivalry.b, rivalry.a];
    facts.push({
      icon: "skull",
      text: `${dom} é o carrasco de ${vic}: ${Math.max(rivalry.w, rivalry.l)} vitórias contra ${Math.min(rivalry.w, rivalry.l)}`,
    });
  }

  facts.push(...chaseFacts(stats).slice(0, 3));
  return facts;
}
