"use client";

import { useEffect, useMemo, useState } from "react";
import { PLAYERS, type Match } from "@/lib/types";
import {
  allStats,
  chrono,
  duoStats,
  formatDate,
  isSolo,
  locationStats,
  pct,
  teamLabel,
  type PlayerStats,
} from "@/lib/stats";
import { generalFacts, type Fact } from "@/lib/facts";
import { GoalsChart, HeadToHead, WinRateChart } from "./Charts";
import MatchForm, { readPin } from "./MatchForm";
import { Avatar, FormDots, Stack, colorVar } from "./ui";

type Mode = "all" | "solo" | "duo";
const MODES: { id: Mode; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "solo", label: "1 x 1" },
  { id: "duo", label: "2 x 2" },
];

function PlayerCard({ s, rank, delay }: { s: PlayerStats; rank: number; delay: number }) {
  const total = Math.max(1, s.played);
  return (
    <div className="card player-card" style={{ ...colorVar(s.name), animationDelay: `${delay}ms` }}>
      <div className="player-top">
        <Avatar name={s.name} />
        <span className="name">{s.name}</span>
        <span className="rank">#{rank}</span>
      </div>
      <div className="player-rate">
        <span className="big num">{s.played ? pct(s.winRate) : "—"}</span>
        <small>de vitórias</small>
      </div>
      <div className="meter" title={`${s.wins} vitórias, ${s.draws} empates, ${s.losses} derrotas`}>
        <span style={{ width: `${(s.wins / total) * 100}%`, background: "var(--win)" }} />
        <span style={{ width: `${(s.draws / total) * 100}%`, background: "var(--draw)" }} />
        <span style={{ width: `${(s.losses / total) * 100}%`, background: "var(--loss)" }} />
      </div>
      <div className="player-stats">
        <div>
          <div className="k">V · E · D</div>
          <div className="v num">
            {s.wins}·{s.draws}·{s.losses}
          </div>
        </div>
        <div>
          <div className="k">Gols / jogo</div>
          <div className="v num">{s.gfAvg.toFixed(1)}</div>
        </div>
        <div>
          <div className="k">Saldo</div>
          <div className="v num">{s.diff > 0 ? `+${s.diff}` : s.diff}</div>
        </div>
      </div>
      <div className="form-row">
        <span>
          {s.played} {s.played === 1 ? "jogo" : "jogos"} · {s.gf} GP · {s.ga} GC
        </span>
        <FormDots form={s.form} />
      </div>
    </div>
  );
}

function FactsCard({ facts }: { facts: Fact[] }) {
  const [i, setI] = useState(0);
  const [order, setOrder] = useState<number[]>([]);

  useEffect(() => {
    setOrder(facts.map((_, k) => k).sort(() => Math.random() - 0.5));
    setI(0);
  }, [facts]);

  useEffect(() => {
    if (facts.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % facts.length), 6500);
    return () => clearInterval(t);
  }, [facts.length, i]);

  const fact = facts[order[i] ?? 0];
  return (
    <div className="card" style={{ animationDelay: "120ms" }}>
      <div className="card-head">
        <div>
          <h2>Curiosidades</h2>
          <p className="sub">Dados do campeonato que mudam a cada partida</p>
        </div>
        {facts.length > 1 && (
          <button className="btn btn-ghost" onClick={() => setI((x) => (x + 1) % facts.length)} aria-label="Próxima curiosidade">
            🎲
          </button>
        )}
      </div>
      {fact ? (
        <>
          <div className="fact-hero fact-anim" key={`${order[i]}-${i}`}>
            <span className="emoji">{fact.icon}</span>
            <span>{fact.text}</span>
          </div>
          <div className="dots-nav">
            {facts.slice(0, 12).map((_, k) => (
              <span key={k} className={k === i % Math.min(12, facts.length) ? "on" : ""} />
            ))}
          </div>
        </>
      ) : (
        <p className="sub">As curiosidades aparecem depois da primeira partida.</p>
      )}
    </div>
  );
}

function MatchRow({ m, onDelete, delay }: { m: Match; onDelete: (m: Match) => void; delay: number }) {
  const aWon = m.scoreA > m.scoreB;
  const bWon = m.scoreB > m.scoreA;
  return (
    <div className="match" style={{ animationDelay: `${delay}ms` }}>
      <div className="when">
        <b>{formatDate(m.date, { day: "2-digit", month: "short", year: "2-digit" })}</b>
        {m.location || "—"}
      </div>
      <div className={`team ${aWon ? "won" : bWon ? "lost" : ""}`}>
        <Stack team={m.teamA} />
        <span className="names">{teamLabel(m.teamA)}</span>
      </div>
      <span className="score num">
        {m.scoreA} – {m.scoreB}
      </span>
      <div className={`team right ${bWon ? "won" : aWon ? "lost" : ""}`}>
        <span className="names">{teamLabel(m.teamB)}</span>
        <Stack team={m.teamB} />
      </div>
      <button className="icon-btn" onClick={() => onDelete(m)} aria-label="Apagar partida" title="Apagar partida">
        ✕
      </button>
    </div>
  );
}

export default function Dashboard({ initialMatches, loadError }: { initialMatches: Match[]; loadError: string | null }) {
  const [matches, setMatches] = useState(() => chrono(initialMatches));
  const [mode, setMode] = useState<Mode>("all");
  const [who, setWho] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(
    () => matches.filter((m) => mode === "all" || (mode === "solo" ? isSolo(m) : !isSolo(m))),
    [matches, mode],
  );
  const stats = useMemo(() => allStats(filtered), [filtered]);
  const ranked = useMemo(
    () => [...stats].sort((a, b) => b.winRate - a.winRate || b.diff - a.diff || b.played - a.played),
    [stats],
  );
  const facts = useMemo(() => generalFacts(filtered), [filtered]);
  const duos = useMemo(() => duoStats(filtered), [filtered]);
  const places = useMemo(() => locationStats(filtered), [filtered]);

  const goals = filtered.reduce((s, m) => s + m.scoreA + m.scoreB, 0);
  const lastMatch = filtered[filtered.length - 1];
  const history = [...filtered].reverse().filter((m) => !who || m.teamA.includes(who) || m.teamB.includes(who));
  const visibleHistory = showAll ? history : history.slice(0, 8);

  async function remove(m: Match) {
    if (!confirm(`Apagar ${teamLabel(m.teamA)} ${m.scoreA} x ${m.scoreB} ${teamLabel(m.teamB)}?`)) return;
    const pin = readPin() || prompt("PIN do grupo") || "";
    const res = await fetch(`/api/matches/${m.id}`, { method: "DELETE", headers: { "x-app-pin": pin } });
    if (!res.ok) return alert((await res.json().catch(() => null))?.error ?? "Erro ao apagar");
    setMatches((list) => list.filter((x) => x.id !== m.id));
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">⚽</div>
          <div>
            <h1>CampFifa</h1>
            <p>{PLAYERS.join(" · ")}</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
          <span aria-hidden>＋</span>
          <span className="btn-label">Nova partida</span>
        </button>
      </header>

      {loadError && <div className="banner-error">Não foi possível carregar as partidas: {loadError}</div>}

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Modo de jogo">
          {MODES.map((m) => (
            <button key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="card empty">
          <div className="emoji">🏟️</div>
          <p>Nenhuma partida ainda. Registre a primeira!</p>
          <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
            ＋ Nova partida
          </button>
        </div>
      ) : (
        <>
          <section className="grid grid-kpi">
            <div className="card kpi">
              <div className="label">Partidas</div>
              <div className="value num">{filtered.length}</div>
              <div className="hint">
                {filtered.filter(isSolo).length} no 1x1 · {filtered.filter((m) => !isSolo(m)).length} no 2x2
              </div>
            </div>
            <div className="card kpi" style={{ animationDelay: "40ms" }}>
              <div className="label">Gols</div>
              <div className="value num">{goals}</div>
              <div className="hint">{filtered.length ? (goals / filtered.length).toFixed(1) : "0"} por partida</div>
            </div>
            <div className="card kpi" style={{ animationDelay: "80ms" }}>
              <div className="label">Líder</div>
              <div className="value num">{ranked[0]?.played ? ranked[0].name : "—"}</div>
              <div className="hint">{ranked[0]?.played ? `${pct(ranked[0].winRate)} de vitórias` : "sem jogos"}</div>
            </div>
            <div className="card kpi" style={{ animationDelay: "120ms" }}>
              <div className="label">Última partida</div>
              <div className="value num">{lastMatch ? `${lastMatch.scoreA}–${lastMatch.scoreB}` : "—"}</div>
              <div className="hint">
                {lastMatch ? `${formatDate(lastMatch.date)}${lastMatch.location ? ` · ${lastMatch.location}` : ""}` : "—"}
              </div>
            </div>
          </section>

          <section className="grid grid-players">
            {ranked.map((s, i) => (
              <PlayerCard key={s.name} s={s} rank={i + 1} delay={i * 60} />
            ))}
          </section>

          <section className="grid grid-2">
            <div className="card">
              <h2>Evolução do % de vitórias</h2>
              <p className="sub">Aproveitamento acumulado de cada jogador, partida a partida</p>
              <WinRateChart matches={filtered} />
            </div>
            <FactsCard facts={facts} />
          </section>

          <section className="grid grid-2-even">
            <div className="card">
              <h2>Gols por partida</h2>
              <p className="sub">Média de gols feitos e sofridos por jogo</p>
              <GoalsChart stats={stats} />
            </div>
            <div className="card">
              <h2>Confronto direto</h2>
              <p className="sub">Vitórias-empates-derrotas da linha contra a coluna</p>
              <HeadToHead matches={filtered} />
            </div>
          </section>

          <section className="grid grid-2-even">
            <div className="card">
              <h2>Duplas</h2>
              <p className="sub">Desempenho jogando juntos no 2x2</p>
              {duos.length ? (
                duos.map((d) => (
                  <div className="list-row" key={d.players.join()}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Stack team={d.players} />
                      {teamLabel(d.players)}
                    </span>
                    <span>
                      <b className="num">{pct(d.winRate)}</b> <span className="muted">· {d.wins}/{d.played}</span>
                    </span>
                  </div>
                ))
              ) : (
                <p className="sub">Nenhuma partida em dupla ainda.</p>
              )}
            </div>
            <div className="card">
              <h2>Locais</h2>
              <p className="sub">Onde o campeonato acontece</p>
              {places.map((l) => (
                <div className="list-row" key={l.name}>
                  <span>📍 {l.name}</span>
                  <span>
                    <b className="num">{l.played}</b>{" "}
                    <span className="muted">
                      {l.played === 1 ? "partida" : "partidas"} · {(l.goals / l.played).toFixed(1)} gols/jogo
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head" style={{ flexWrap: "wrap", marginBottom: 8 }}>
              <div>
                <h2>Histórico de partidas</h2>
                <p className="sub" style={{ marginBottom: 0 }}>
                  {history.length} {history.length === 1 ? "partida" : "partidas"}
                </p>
              </div>
              <div className="chips">
                {PLAYERS.map((p) => (
                  <button
                    key={p}
                    className="chip"
                    style={colorVar(p)}
                    aria-pressed={who === p}
                    onClick={() => setWho(who === p ? null : p)}
                  >
                    <Avatar name={p} />
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="matches">
              {visibleHistory.map((m, i) => (
                <MatchRow key={m.id} m={m} onDelete={remove} delay={Math.min(i, 8) * 30} />
              ))}
            </div>
            {history.length > 8 && (
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Mostrar menos" : `Ver todas (${history.length})`}
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {formOpen && (
        <MatchForm
          matches={matches}
          onClose={() => setFormOpen(false)}
          onSaved={(m) => setMatches((list) => chrono([...list, m]))}
        />
      )}
    </main>
  );
}
