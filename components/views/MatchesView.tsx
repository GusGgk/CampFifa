"use client";

import { useMemo, useState } from "react";
import { PLAYERS, type Match } from "@/lib/types";
import { formatDate, sideOf } from "@/lib/stats";
import { useApp, useFilteredMatches, useQuery } from "../AppProvider";
import { MatchRow, Select } from "../ui";
import { EmptyState } from "./DashboardView";

const DAYS_PER_PAGE = 10;

export default function MatchesView() {
  const { matches } = useApp();
  const ms = useFilteredMatches();
  const { params, setParams } = useQuery();
  const [days, setDays] = useState(DAYS_PER_PAGE);

  // Filters live in the URL so a player's profile can link straight to their matches.
  const who = params.get("jogador") ?? "";
  const place = params.get("local") ?? "";
  const setFilter = (key: string, value: string) => setParams({ [key]: value || null });

  const locations = useMemo(() => [...new Set(matches.map((m) => m.location || "Sem local"))].sort(), [matches]);
  const groups = useMemo(() => {
    const list = [...ms]
      .reverse()
      .filter((m) => (!who || sideOf(m, who)) && (!place || (m.location || "Sem local") === place));
    const out: { date: string; matches: Match[] }[] = [];
    for (const m of list) {
      const g = out[out.length - 1];
      if (g && g.date === m.date) g.matches.push(m);
      else out.push({ date: m.date, matches: [m] });
    }
    return out;
  }, [ms, who, place]);
  const total = groups.reduce((t, g) => t + g.matches.length, 0);

  return (
    <main className="page">
      <div className="page-h">
        <div>
          <h1>Partidas</h1>
          <p>
            {total} {total === 1 ? "partida" : "partidas"} em {groups.length} {groups.length === 1 ? "dia" : "dias"} de
            campeonato
          </p>
        </div>
        <div className="filters">
          <Select
            id="f-jogador"
            label="Jogador"
            value={who}
            onChange={(v) => setFilter("jogador", v)}
            options={[{ value: "", label: "Todos os jogadores" }, ...PLAYERS.map((p) => ({ value: p, label: p }))]}
          />
          <Select
            id="f-local"
            label="Local"
            value={place}
            onChange={(v) => setFilter("local", v)}
            options={[{ value: "", label: "Todos os locais" }, ...locations.map((l) => ({ value: l, label: l }))]}
          />
        </div>
      </div>

      {!matches.length ? (
        <EmptyState />
      ) : !groups.length ? (
        <p className="muted">Nenhuma partida com esses filtros.</p>
      ) : (
        <div>
          {groups.slice(0, days).map((g) => {
            const locs = [...new Set(g.matches.map((m) => m.location).filter(Boolean))];
            return (
              <section key={g.date}>
                <div className="day">
                  <b>{formatDate(g.date, { weekday: "short", day: "2-digit", month: "short" }).replace(",", "")}</b>
                  {locs.join(" · ") || "Sem local"} · {g.matches.length} {g.matches.length === 1 ? "jogo" : "jogos"}
                </div>
                <div className="mrows">
                  {g.matches.map((m) => (
                    <MatchRow key={m.id} m={m} />
                  ))}
                </div>
              </section>
            );
          })}
          {groups.length > days && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
              <button type="button" className="btn" onClick={() => setDays((d) => d + DAYS_PER_PAGE)}>
                Mostrar mais dias ({groups.length - days})
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
