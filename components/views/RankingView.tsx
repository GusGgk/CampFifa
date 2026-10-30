"use client";

import { useMemo } from "react";
import { duoStats, locationStats, pct, standings, teamLabel } from "@/lib/stats";
import { GoalsChart, HeadToHead } from "../Charts";
import { useFilteredMatches } from "../AppProvider";
import { Stack, SectionHead, StandingsBands, TIERS, tierVar } from "../ui";
import { EmptyState } from "./DashboardView";

export default function RankingView() {
  const ms = useFilteredMatches();
  const rows = useMemo(() => standings(ms), [ms]);
  const duos = useMemo(() => duoStats(ms), [ms]);
  const places = useMemo(() => locationStats(ms), [ms]);

  return (
    <main className="page">
      <div className="page-h">
        <div>
          <h1>Ranking</h1>
          <p>
            {ms.length} {ms.length === 1 ? "partida" : "partidas"} · pontos 3/1/0 só como referência, a ordem é por % de
            vitórias
          </p>
        </div>
        <div className="tier-legend">
          {TIERS.map((t) => (
            <span key={t.label} style={tierVar(t.color)}>
              <i />
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {!ms.length ? (
        <EmptyState />
      ) : (
        <>
          <StandingsBands rows={rows} />

          <div className="two-col">
            <div>
              <SectionHead title="Confronto direto" sub="V-E-D da linha contra a coluna. Quanto mais laranja, mais a linha domina." />
              <HeadToHead matches={ms} />
            </div>
            <div>
              <SectionHead title="Gols por partida" sub="Média de gols feitos e sofridos por jogo" />
              <GoalsChart stats={rows} />
            </div>
          </div>

          <div className="two-col">
            <div>
              <SectionHead title="Duplas" sub="Desempenho jogando juntos no 2x2" />
              {duos.length ? (
                <div className="scroll-x">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="l">Dupla</th>
                        <th>J</th>
                        <th>V</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duos.map((d) => (
                        <tr key={d.players.join()}>
                          <td className="l">
                            <span className="who">
                              <Stack team={d.players} size="sm" />
                              {teamLabel(d.players)}
                            </span>
                          </td>
                          <td>{d.played}</td>
                          <td>{d.wins}</td>
                          <td className="hi">{pct(d.winRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">Nenhuma partida em dupla neste modo.</p>
              )}
            </div>
            <div>
              <SectionHead title="Locais" sub="Onde o campeonato acontece" />
              <div className="scroll-x">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="l">Local</th>
                      <th>Partidas</th>
                      <th>Gols</th>
                      <th>Gols / jogo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {places.map((l) => (
                      <tr key={l.name}>
                        <td className="l">
                          <span className="who">{l.name}</span>
                        </td>
                        <td>{l.played}</td>
                        <td>{l.goals}</td>
                        <td className="hi">{(l.goals / l.played).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
