"use client";

import { useMemo } from "react";
import { PLAYERS } from "@/lib/types";
import { headToHead, pct, playerStats, sideOf, type PlayerStats } from "@/lib/stats";
import { useFilteredMatches, useQuery } from "../AppProvider";
import { Avatar, MatchRow, SectionHead, Select, colorVar } from "../ui";

type Metric = { label: string; value: (s: PlayerStats) => number; format: (v: number) => string; lowerIsBetter?: boolean };

const METRICS: Metric[] = [
  { label: "% vitórias", value: (s) => s.winRate, format: pct },
  { label: "Gols / jogo", value: (s) => s.gfAvg, format: (v) => v.toFixed(1) },
  { label: "Sofridos / jogo", value: (s) => s.gaAvg, format: (v) => v.toFixed(1), lowerIsBetter: true },
  { label: "Saldo", value: (s) => s.diff, format: (v) => (v > 0 ? `+${v}` : `${v}`) },
  { label: "Vitórias", value: (s) => s.wins, format: String },
  { label: "Sem sofrer gol", value: (s) => s.cleanSheets, format: String },
  { label: "Jogos", value: (s) => s.played, format: String },
];

export default function CompareView() {
  const { params, setParams } = useQuery();
  const ms = useFilteredMatches();

  const pick = (key: string, fallback: string, other?: string) => {
    const v = params.get(key);
    return v && (PLAYERS as readonly string[]).includes(v) && v !== other ? v : fallback;
  };
  const a = pick("a", PLAYERS[0]);
  const b = pick("b", PLAYERS.find((p) => p !== a)!, a);

  const set = (key: "a" | "b", value: string) => setParams({ [key]: value });

  const A = useMemo(() => playerStats(ms, a), [ms, a]);
  const B = useMemo(() => playerStats(ms, b), [ms, b]);
  const h = headToHead(ms, a, b);
  const meetings = ms.filter((m) => {
    const sa = sideOf(m, a);
    const sb = sideOf(m, b);
    return sa && sb && sa !== sb;
  });

  const options = (exclude: string) => PLAYERS.filter((p) => p !== exclude).map((p) => ({ value: p, label: p }));

  return (
    <main className="page">
      <div className="page-h">
        <div>
          <h1>Comparar</h1>
          <p>Números lado a lado e confronto direto. O melhor de cada linha fica destacado.</p>
        </div>
      </div>

      <div className="duel">
        <div className="p">
          <Avatar name={a} size="lg" />
          <Select id="cmp-a" label="Jogador 1" value={a} options={options(b)} onChange={(v) => set("a", v)} />
        </div>
        <div className="mid num">
          <span className="label">Confronto direto</span>
          <b>
            {h.wins} – {h.draws} – {h.losses}
          </b>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {h.played} {h.played === 1 ? "jogo" : "jogos"} · V-E-D de {a}
          </span>
        </div>
        <div className="p r">
          <Select id="cmp-b" label="Jogador 2" value={b} options={options(a)} onChange={(v) => set("b", v)} />
          <Avatar name={b} size="lg" />
        </div>
      </div>

      <div className="mirror">
        {METRICS.map((m) => {
          const va = m.value(A);
          const vb = m.value(B);
          const max = Math.max(Math.abs(va), Math.abs(vb)) || 1;
          const aBest = m.lowerIsBetter ? va < vb : va > vb;
          const bBest = m.lowerIsBetter ? vb < va : vb > va;
          return (
            <div key={m.label} style={{ display: "contents" }}>
              <div className={`l ${aBest ? "best" : ""}`} style={colorVar(a)}>
                <i style={{ width: `${(Math.abs(va) / max) * 100}%` }} />
                <span className="num">{m.format(va)}</span>
              </div>
              <div className="lab label">{m.label}</div>
              <div className={`r ${bBest ? "best" : ""}`} style={colorVar(b)}>
                <i style={{ width: `${(Math.abs(vb) / max) * 100}%` }} />
                <span className="num">{m.format(vb)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <SectionHead title="Últimos encontros" sub={`Partidas com ${a} e ${b} em lados opostos`} />
        {meetings.length ? (
          <div className="mrows">
            {[...meetings]
              .reverse()
              .slice(0, 8)
              .map((m) => (
                <MatchRow key={m.id} m={m} />
              ))}
          </div>
        ) : (
          <p className="muted">Os dois ainda não se enfrentaram neste modo.</p>
        )}
      </div>
    </main>
  );
}
