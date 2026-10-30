"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { PLAYERS, type Match } from "@/lib/types";
import { matchFacts, type Fact } from "@/lib/facts";
import { teamLabel } from "@/lib/stats";
import { Avatar, FactList, Score, colorVar } from "./ui";

const PIN_KEY = "campfifa-pin";

export function readPin() {
  try {
    return localStorage.getItem(PIN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePin(pin: string) {
  try {
    localStorage.setItem(PIN_KEY, pin);
  } catch {}
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Diminuir ${label}`}>
        <Minus size={16} />
      </button>
      <input
        className="num"
        type="number"
        min={0}
        max={99}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Math.max(0, Math.min(99, Number(e.target.value) || 0)))}
      />
      <button type="button" onClick={() => onChange(Math.min(99, value + 1))} aria-label={`Aumentar ${label}`}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export default function MatchForm({
  matches,
  onClose,
  onSaved,
}: {
  matches: Match[];
  onClose: () => void;
  onSaved: (m: Match) => void;
}) {
  const last = matches[matches.length - 1];
  const [date, setDate] = useState(today);
  const [location, setLocation] = useState(last?.location ?? "");
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ match: Match; facts: Fact[] } | null>(null);

  useEffect(() => setPin(readPin()), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const locations = useMemo(() => [...new Set(matches.map((m) => m.location).filter(Boolean))], [matches]);

  function toggle(side: "A" | "B", p: string) {
    const [team, set] = side === "A" ? [teamA, setTeamA] : [teamB, setTeamB];
    set(team.includes(p) ? team.filter((x) => x !== p) : [...team, p]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamA.length || !teamB.length) return setError("Escolha os jogadores dos dois lados");
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "content-type": "application/json", "x-app-pin": pin },
        body: JSON.stringify({ date, location, teamA, teamB, scoreA, scoreB }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Erro ao salvar");
      savePin(pin);
      const saved = body as Match;
      setResult({ match: saved, facts: matchFacts(matches, [...matches, saved], saved) });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const side = (key: "A" | "B", team: string[], other: string[], score: number, setScore: (v: number) => void) => (
    <div className="team-pick">
      <span className="label">Time {key}</span>
      <div className="pick-list">
        {PLAYERS.map((p) => (
          <button
            key={p}
            type="button"
            className="pick"
            style={colorVar(p)}
            aria-pressed={team.includes(p)}
            disabled={other.includes(p) || (!team.includes(p) && team.length >= 2)}
            onClick={() => toggle(key, p)}
          >
            <Avatar name={p} size="sm" />
            {p}
          </button>
        ))}
      </div>
      <Stepper value={score} onChange={setScore} label={`gols do time ${key}`} />
    </div>
  );

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Nova partida">
        {result ? (
          <>
            <div className="saved">
              <span className="label" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <Check size={14} /> Partida registrada
              </span>
              <Score m={result.match} />
              <div>
                {result.match.scoreA === result.match.scoreB ? (
                  <span className="who-won">Empate</span>
                ) : (
                  <>
                    <span className="who-won">
                      {teamLabel(result.match.scoreA > result.match.scoreB ? result.match.teamA : result.match.teamB)}
                    </span>{" "}
                    venceu{" "}
                    {teamLabel(result.match.scoreA > result.match.scoreB ? result.match.teamB : result.match.teamA)}
                  </>
                )}
              </div>
            </div>
            {result.facts.length > 0 && <FactList facts={result.facts} compact />}
            <div className="modal-actions" style={{ marginTop: 18 }}>
              <button className="btn" onClick={() => setResult(null)}>
                Registrar outra
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Fechar
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2>Nova partida</h2>
            <div className="row-2">
              <div className="field">
                <label className="label" htmlFor="f-date">Data</label>
                <input id="f-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="field">
                <label className="label" htmlFor="f-loc">Local</label>
                <input
                  id="f-loc"
                  className="input"
                  list="f-locs"
                  placeholder="Casa do Gk"
                  value={location}
                  maxLength={60}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <datalist id="f-locs">
                  {locations.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="versus">
              {side("A", teamA, teamB, scoreA, setScoreA)}
              <span className="vs-tag">VS</span>
              {side("B", teamB, teamA, scoreB, setScoreB)}
            </div>
            <div className="field">
              <label className="label" htmlFor="f-pin">PIN do grupo</label>
              <input
                id="f-pin"
                className="input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Fica salvo neste aparelho"
              />
            </div>
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Salvando…" : "Salvar partida"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
