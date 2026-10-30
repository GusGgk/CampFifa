"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, MapPin, Trash2 } from "lucide-react";
import { matchFacts } from "@/lib/facts";
import { formatDate, headToHead, isSolo, teamLabel } from "@/lib/stats";
import { useApp, useMode } from "../AppProvider";
import { useDialogs } from "../Dialogs";
import { FactList, Score, SectionHead, Stack, modeLabel, winnerSide } from "../ui";

export default function MatchView({ id }: { id: number }) {
  const { matches, refresh } = useApp();
  const { href } = useMode();
  const router = useRouter();
  const dialogs = useDialogs();
  const [deleting, setDeleting] = useState(false);
  const index = matches.findIndex((m) => m.id === id);
  const match = matches[index];

  const facts = useMemo(
    () => (match ? matchFacts(matches.slice(0, index), matches.slice(0, index + 1), match) : []),
    [matches, index, match],
  );

  if (!match) {
    return (
      <main className="page">
        <Link className="back" href={href("/partidas")}>
          <ArrowLeft size={14} /> Partidas
        </Link>
        <p className="muted">Essa partida não existe mais.</p>
      </main>
    );
  }

  const w = winnerSide(match);
  const result = (side: "A" | "B") => (!w ? "Empate" : w === side ? "Vitória" : "Derrota");
  const prev = matches[index - 1];
  const next = matches[index + 1];
  const duel = isSolo(match) ? headToHead(matches.slice(0, index + 1), match.teamA[0], match.teamB[0]) : null;

  async function remove() {
    const ok = await dialogs.confirm({
      title: "Apagar partida?",
      message: `${teamLabel(match.teamA)} ${match.scoreA} x ${match.scoreB} ${teamLabel(match.teamB)}, ${formatDate(match.date)}. Isso muda o ranking e não dá para desfazer.`,
      confirmLabel: "Apagar",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    const res = await dialogs.withPin((pin) =>
      fetch(`/api/matches/${match.id}`, { method: "DELETE", headers: { "x-app-pin": pin } }),
    );
    setDeleting(false);
    if (!res) return;
    if (!res.ok) {
      return dialogs.info("Não foi possível apagar", (await res.json().catch(() => null))?.error ?? "Tente de novo.");
    }
    router.push(href("/partidas"));
    refresh();
  }

  return (
    <main className="page">
      <div>
        <Link className="back" href={href("/partidas")}>
          <ArrowLeft size={14} /> Partidas
        </Link>
        <div className="broadcast">
          <div className="strip">
            <span>
              <Calendar size={14} />
              {formatDate(match.date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </span>
            <span>
              <MapPin size={14} />
              {match.location || "Sem local"}
            </span>
            <span>
              {modeLabel(match)} · Partida nº {index + 1}
            </span>
          </div>
          <div className="board">
            <div className={`side ${w === "B" ? "lost" : ""}`}>
              <Stack team={match.teamA} size="lg" />
              <span className="names">{match.teamA.join(" & ")}</span>
              <span className={`result ${w === "A" ? "tx-win" : ""}`}>{result("A")}</span>
            </div>
            <Score m={match} />
            <div className={`side r ${w === "A" ? "lost" : ""}`}>
              <Stack team={match.teamB} size="lg" />
              <span className="names">{match.teamB.join(" & ")}</span>
              <span className="result">{result("B")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div>
          <SectionHead title="O que essa partida mudou" sub="Calculado com o histórico até este jogo" />
          {facts.length ? <FactList facts={facts} /> : <p className="muted">Nada fora do comum nesta partida.</p>}
        </div>
        <div>
          {duel && (
            <div style={{ marginBottom: 28 }}>
              <SectionHead title="Confronto direto até aqui" />
              <dl className="kv num">
                <dt>{match.teamA[0]}</dt>
                <dd>{duel.wins} vitórias</dd>
                <dt>{match.teamB[0]}</dt>
                <dd>{duel.losses} vitórias</dd>
                <dt>Empates</dt>
                <dd>{duel.draws}</dd>
              </dl>
            </div>
          )}
          <SectionHead title="Navegar" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {prev && (
              <Link className="btn" href={href(`/partidas/${prev.id}`)}>
                <ChevronLeft size={16} /> Anterior
              </Link>
            )}
            {next && (
              <Link className="btn" href={href(`/partidas/${next.id}`)}>
                Próxima <ChevronRight size={16} />
              </Link>
            )}
            <button type="button" className="btn btn-danger" onClick={remove} disabled={deleting}>
              <Trash2 size={16} /> {deleting ? "Apagando…" : "Apagar partida"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
