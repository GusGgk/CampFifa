"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { generalFacts } from "@/lib/facts";
import { formatDate, isSolo, pct, standings } from "@/lib/stats";
import { WinRateChart } from "../Charts";
import { useApp, useFilteredMatches, useMode } from "../AppProvider";
import { Avatar, FactList, MatchCard, SectionHead, StandingsBands, TIERS, tierVar } from "../ui";

export function EmptyState() {
  const { openForm } = useApp();
  return (
    <div className="empty">
      <Image src="/brand/logo-competitivo.png" alt="" width={120} height={112} />
      <b>Nenhuma partida ainda</b>
      <span>Registre a primeira e o Bagromêtro começa a medir.</span>
      <button type="button" className="btn-cta" onClick={openForm}>
        <Plus size={18} strokeWidth={2.5} /> Nova partida
      </button>
    </div>
  );
}

export default function DashboardView() {
  const { matches } = useApp();
  const { href } = useMode();
  const ms = useFilteredMatches();
  const rows = useMemo(() => standings(ms), [ms]);
  const facts = useMemo(() => generalFacts(ms), [ms]);

  if (!matches.length) {
    return (
      <main className="page">
        <EmptyState />
      </main>
    );
  }

  const goals = ms.reduce((t, m) => t + m.scoreA + m.scoreB, 0);
  const played = rows.filter((s) => s.played);
  const leader = played[0];
  const bagre = played.length > 1 ? played[played.length - 1] : null;
  const hot = [...played]
    .filter((s) => s.streak?.type === "V" && s.streak.count >= 2)
    .sort((a, b) => b.streak!.count - a.streak!.count)[0];
  const first = matches[0].date;
  const last = matches[matches.length - 1].date;
  const years = first.slice(0, 4) === last.slice(0, 4) ? first.slice(0, 4) : `${first.slice(0, 4)}–${last.slice(2, 4)}`;
  const places = new Set(matches.map((m) => m.location).filter(Boolean)).size;

  return (
    <main className="dash">
      <aside className="season">
        <Image className="logo" src="/brand/logo-competitivo.png" alt="Bagromêtro" width={190} height={177} priority />
        <div>
          <h2>Temporada {years}</h2>
          <div className="sub">
            {formatDate(first, { day: "2-digit", month: "short", year: "numeric" })} até{" "}
            {formatDate(last, { day: "2-digit", month: "short", year: "numeric" })} · {places}{" "}
            {places === 1 ? "local" : "locais"}
          </div>
        </div>
        <dl className="kv num">
          <dt>Partidas</dt>
          <dd>{ms.length}</dd>
          <dt>Gols</dt>
          <dd>{goals}</dd>
          <dt>Média</dt>
          <dd>{ms.length ? (goals / ms.length).toFixed(1) : "0"} / jogo</dd>
          <dt>1x1 · 2x2</dt>
          <dd>
            {ms.filter(isSolo).length} · {ms.filter((m) => !isSolo(m)).length}
          </dd>
        </dl>
        {leader && (
          <Link className="spot" style={tierVar(TIERS[0].color)} href={href(`/jogadores/${leader.name}`)}>
            <Avatar name={leader.name} />
            <span>
              <span className="tier" style={tierVar(TIERS[0].color)}>
                Líder
              </span>
              <span className="nm">{leader.name}</span>
            </span>
            <span className="big num">{pct(leader.winRate)}</span>
          </Link>
        )}
        {bagre && (
          <Link className="spot" style={tierVar(TIERS[3].color)} href={href(`/jogadores/${bagre.name}`)}>
            <Avatar name={bagre.name} />
            <span>
              <span className="tier" style={tierVar(TIERS[3].color)}>
                Bagre da vez
              </span>
              <span className="nm">{bagre.name}</span>
            </span>
            <span className="big num">{pct(bagre.winRate)}</span>
          </Link>
        )}
        {hot && (
          <dl className="kv">
            <dt>Embalado</dt>
            <dd>
              {hot.name} · {hot.streak!.count} vitórias seguidas
            </dd>
          </dl>
        )}
      </aside>

      <section className="dash-main">
        <div>
          <SectionHead
            title="Classificação"
            sub="Ordem por % de vitórias, depois saldo. Setas: variação desde o dia de jogo anterior."
            more={{ href: href("/ranking"), label: "Ranking completo" }}
          />
          {ms.length ? <StandingsBands rows={rows} /> : <p className="muted">Nenhuma partida neste modo.</p>}
        </div>
        {facts.length > 0 && (
          <div>
            <SectionHead title="Curiosidades" sub="Mudam a cada partida registrada" />
            <FactList facts={facts.slice(0, 6)} />
          </div>
        )}
        <div>
          <SectionHead title="Evolução" sub="% de vitórias acumulado, partida a partida" />
          <WinRateChart matches={ms} />
        </div>
      </section>

      <aside className="recent">
        <SectionHead title="Últimos jogos" more={{ href: href("/partidas"), label: "Todos" }} />
        {[...ms]
          .reverse()
          .slice(0, 6)
          .map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
      </aside>
    </main>
  );
}
