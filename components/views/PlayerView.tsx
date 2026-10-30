"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BrickWall, Crown, Flame, GitCompare, Skull, Target } from "lucide-react";
import { PLAYERS } from "@/lib/types";
import {
  bestWinStreak,
  duoStats,
  headToHead,
  outcome,
  pct,
  sideOf,
  standings,
  teamLabel,
} from "@/lib/stats";
import { WinRateChart } from "../Charts";
import { useFilteredMatches, useMode } from "../AppProvider";
import PhotoControls from "../PhotoControls";
import { Avatar, FormDots, MatchRow, SectionHead, Stack, tierOf, tierVar } from "../ui";

const streakWord = { V: ["vitória", "vitórias"], E: ["empate", "empates"], D: ["derrota", "derrotas"] } as const;

export default function PlayerView({ name }: { name: string }) {
  const { href } = useMode();
  const ms = useFilteredMatches();
  const rows = useMemo(() => standings(ms), [ms]);
  const s = rows.find((r) => r.name === name)!;
  const tier = tierOf(s.pos, rows.length, s.played);
  const mine = useMemo(() => ms.filter((m) => sideOf(m, name)), [ms, name]);
  const rivals = PLAYERS.filter((p) => p !== name).map((p) => ({ name: p, ...headToHead(ms, name, p) }));
  const duos = duoStats(ms).filter((d) => d.players.includes(name));

  // Achievements come straight from the history; the ones not reached yet show faded.
  const margin = (m: (typeof mine)[number]) => (sideOf(m, name) === "A" ? m.scoreA - m.scoreB : m.scoreB - m.scoreA);
  const bestWin = [...mine].filter((m) => outcome(m, name) === "V").sort((a, b) => margin(b) - margin(a))[0];
  const streak = bestWinStreak(ms, name);
  const victim = [...rivals].filter((r) => r.wins).sort((a, b) => b.wins - a.wins)[0];
  const nemesis = [...rivals].filter((r) => r.losses).sort((a, b) => b.losses - a.losses)[0];
  const badges = [
    {
      icon: Target,
      title: "Maior goleada",
      text: bestWin
        ? `${Math.max(bestWin.scoreA, bestWin.scoreB)} a ${Math.min(bestWin.scoreA, bestWin.scoreB)} em ${teamLabel(sideOf(bestWin, name) === "A" ? bestWin.teamB : bestWin.teamA)}`
        : "Ainda sem vitória",
      on: !!bestWin,
    },
    { icon: Flame, title: "Melhor sequência", text: `${streak} ${streak === 1 ? "vitória" : "vitórias"} seguidas`, on: streak >= 2 },
    { icon: BrickWall, title: "Muralha", text: `${s.cleanSheets} ${s.cleanSheets === 1 ? "jogo" : "jogos"} sem sofrer gol`, on: s.cleanSheets > 0 },
    {
      icon: Crown,
      title: "Freguês",
      text: victim ? `${victim.name}: ${victim.wins} ${victim.wins === 1 ? "vitória" : "vitórias"} no confronto` : "Ninguém ainda",
      on: !!victim,
    },
    {
      icon: Skull,
      title: "Pedra no sapato",
      text: nemesis ? `${nemesis.name}: ${nemesis.losses} ${nemesis.losses === 1 ? "derrota" : "derrotas"} no confronto` : "Ninguém ainda",
      on: !!nemesis,
      danger: true,
    },
  ];

  return (
    <main className="page">
      <div className="profile-head" style={tierVar(tier.color)}>
        <div className="photo">
          <Avatar name={name} size="xl" />
        </div>
        <div style={{ minWidth: 0 }}>
          <span className="tier" style={tierVar(tier.color)}>
            {tier.label} · {s.played ? `${s.pos}º lugar` : "fora do ranking"}
          </span>
          <h1>{name}</h1>
          <div className="line num">
            <span>
              {s.played} {s.played === 1 ? "jogo" : "jogos"} · {s.wins}V {s.draws}E {s.losses}D
            </span>
            <FormDots form={s.form} />
            {s.streak && s.streak.count >= 2 && (
              <span>
                {s.streak.count} {streakWord[s.streak.type][1]} seguidas
              </span>
            )}
          </div>
        </div>
        <div className="actions">
          <PhotoControls name={name} />
          <Link className="btn btn-sm" href={href("/comparar", { a: name })}>
            <GitCompare size={14} /> Comparar
          </Link>
        </div>
      </div>

      <div className="stat-strip num">
        <div className="stat accent">
          <span className="label">% vitórias</span>
          <span className="v">{s.played ? pct(s.winRate) : "—"}</span>
          <span className="h">{s.points} pontos (3/1/0)</span>
        </div>
        <div className="stat">
          <span className="label">Saldo</span>
          <span className="v">{s.diff > 0 ? `+${s.diff}` : s.diff}</span>
          <span className="h">
            {s.gf} feitos · {s.ga} sofridos
          </span>
        </div>
        <div className="stat">
          <span className="label">Gols / jogo</span>
          <span className="v">{s.gfAvg.toFixed(1)}</span>
          <span className="h">ataque</span>
        </div>
        <div className="stat">
          <span className="label">Sofridos / jogo</span>
          <span className="v">{s.gaAvg.toFixed(1)}</span>
          <span className="h">defesa</span>
        </div>
        <div className="stat">
          <span className="label">Sem sofrer</span>
          <span className="v">{s.cleanSheets}</span>
          <span className="h">{s.played ? pct(s.cleanSheets / s.played) : "—"} dos jogos</span>
        </div>
        <div className="stat">
          <span className="label">Posição</span>
          <span className="v">{s.played ? `${s.pos}º` : "—"}</span>
          <span className="h">de {rows.length}</span>
        </div>
      </div>

      <div>
        <SectionHead title="Conquistas" />
        <div className="badges">
          {badges.map((b) => (
            <div
              key={b.title}
              className={`badge${b.on ? "" : " off"}`}
              style={b.danger ? tierVar("var(--loss)") : undefined}
            >
              <span className="ic">
                <b.icon size={20} />
              </span>
              <span>
                <b>{b.title}</b>
                <span>{b.text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionHead title="Evolução" sub={`% de vitórias acumulado; ${name} em destaque`} />
        <WinRateChart matches={ms} focus={name} />
      </div>

      <div className="two-col">
        <div>
          <SectionHead title="Contra cada rival" sub="Só partidas em lados opostos" />
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th className="l">Rival</th>
                  <th>J</th>
                  <th>V</th>
                  <th>E</th>
                  <th>D</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {rivals.map((r) => (
                  <tr key={r.name}>
                    <td className="l">
                      <Link className="who" href={href(`/jogadores/${r.name}`)} style={{ textDecoration: "none" }}>
                        <Avatar name={r.name} size="sm" />
                        {r.name}
                      </Link>
                    </td>
                    <td>{r.played}</td>
                    <td>{r.wins}</td>
                    <td>{r.draws}</td>
                    <td>{r.losses}</td>
                    <td className={r.played && r.wins > r.losses ? "hi" : ""}>{r.played ? pct(r.wins / r.played) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <SectionHead title="Duplas" sub="Jogando junto no 2x2" />
          {duos.length ? (
            <div className="scroll-x">
              <table className="table">
                <thead>
                  <tr>
                    <th className="l">Parceiro</th>
                    <th>J</th>
                    <th>V</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {duos.map((d) => {
                    const mate = d.players.find((p) => p !== name)!;
                    return (
                      <tr key={mate}>
                        <td className="l">
                          <span className="who">
                            <Stack team={[mate]} size="sm" />
                            {mate}
                          </span>
                        </td>
                        <td>{d.played}</td>
                        <td>{d.wins}</td>
                        <td className="hi">{pct(d.winRate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Nenhuma partida em dupla neste modo.</p>
          )}
        </div>
      </div>

      <div>
        <SectionHead
          title="Últimas partidas"
          more={mine.length > 6 ? { href: href("/partidas", { jogador: name }), label: `Todas (${mine.length})` } : undefined}
        />
        {mine.length ? (
          <div className="mrows">
            {[...mine]
              .reverse()
              .slice(0, 6)
              .map((m) => (
                <MatchRow key={m.id} m={m} />
              ))}
          </div>
        ) : (
          <p className="muted">Nenhuma partida neste modo.</p>
        )}
      </div>
    </main>
  );
}
