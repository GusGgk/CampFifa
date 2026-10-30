"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  BarChart3,
  BrickWall,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Crown,
  Flag,
  Flame,
  Goal,
  Handshake,
  MapPin,
  Medal,
  Minus,
  PartyPopper,
  Repeat,
  Shield,
  ShieldAlert,
  Skull,
  Snowflake,
  Sparkles,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PLAYERS, type Match } from "@/lib/types";
import { formatDate, isSolo, teamLabel, type Outcome, type RankedStats } from "@/lib/stats";
import type { Fact, FactIcon } from "@/lib/facts";
import { useApp, useMode } from "./AppProvider";

/** Each player owns one categorical slot, so their color never changes with rank or filters. */
export function playerColor(name: string) {
  const i = PLAYERS.indexOf(name as (typeof PLAYERS)[number]);
  return i >= 0 ? `var(--series-${i + 1})` : "var(--mut)";
}

export const colorVar = (name: string) => ({ "--c": playerColor(name) }) as CSSProperties;

export const photoUrl = (name: string, version: string) =>
  `/api/players/${encodeURIComponent(name)}/photo?v=${version}`;

type AvatarSize = "sm" | "md" | "lg" | "xl";

export function Avatar({ name, size = "md" }: { name: string; size?: AvatarSize }) {
  const { photos } = useApp();
  const version = photos[name];
  const cls = `avatar${size === "md" ? "" : ` ${size}`}${version ? " has-photo" : ""}`;
  return (
    <span className={cls} style={colorVar(name)} aria-hidden>
      {version ? <img src={photoUrl(name, version)} alt="" loading="lazy" /> : name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function Stack({ team, size = "md" }: { team: string[]; size?: AvatarSize }) {
  return (
    <span className="stack">
      {team.map((p) => (
        <Avatar key={p} name={p} size={size} />
      ))}
    </span>
  );
}

const outcomeLabel: Record<Outcome, string> = { V: "Vitória", E: "Empate", D: "Derrota" };

export function FormDots({ form }: { form: Outcome[] }) {
  if (!form.length) return <span className="muted">—</span>;
  return (
    <span className="form">
      {form.map((r, i) => (
        <span key={i} className={r} title={outcomeLabel[r]}>
          {r}
        </span>
      ))}
    </span>
  );
}

/** Tier comes from the position; whoever is last is the "bagre" of the moment. */
export const TIERS = [
  { label: "Ouro", color: "var(--gold)" },
  { label: "Prata", color: "var(--silver)" },
  { label: "Bronze", color: "var(--bronze)" },
  { label: "Bagre", color: "var(--bagre)" },
];

export function tierOf(pos: number, total: number, played: number) {
  // Secondary text color: readable on both themes (the divider color is nearly invisible as text).
  if (!played) return { label: "Sem jogos", color: "var(--mut)" };
  return pos === total ? TIERS[TIERS.length - 1] : (TIERS[pos - 1] ?? TIERS[2]);
}

export const tierVar = (color: string) => ({ "--t": color }) as CSSProperties;

export function Delta({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="delta up" title={`Subiu ${value}`}>
        <ChevronUp size={14} />
        {value}
      </span>
    );
  if (value < 0)
    return (
      <span className="delta down" title={`Caiu ${-value}`}>
        <ChevronDown size={14} />
        {-value}
      </span>
    );
  return (
    <span className="delta eq" title="Manteve a posição">
      <Minus size={14} />
    </span>
  );
}

export function Select({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <span className="select">
      <select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </span>
  );
}

export function ModeSelect({ id = "modo" }: { id?: string }) {
  const { mode, setMode } = useMode();
  return (
    <Select
      id={id}
      label="Modo de jogo"
      value={mode}
      onChange={(v) => setMode(v as typeof mode)}
      options={[
        { value: "all", label: "Todas" },
        { value: "solo", label: "1x1" },
        { value: "duo", label: "2x2" },
      ]}
    />
  );
}

export function SectionHead({
  title,
  sub,
  more,
  children,
}: {
  title: string;
  sub?: string;
  more?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="sec-h">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {children}
      {more && (
        <Link className="more" href={more.href}>
          {more.label} <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function StandingsBands({ rows }: { rows: RankedStats[] }) {
  const { href } = useMode();
  return (
    <div className="scroll-x">
      <div className="bands">
        <div className="hd">
          <span>Pos</span>
          <span>Jogador</span>
          <span className="c">J</span>
          <span className="c">V</span>
          <span className="c">E</span>
          <span className="c">D</span>
          <span className="c">SG</span>
          <span className="c">%</span>
          <span className="c">Pts</span>
          <span>Forma</span>
        </div>
        {rows.map((s) => {
          const tier = tierOf(s.pos, rows.length, s.played);
          return (
            <Link key={s.name} className="band num" style={tierVar(tier.color)} href={href(`/jogadores/${s.name}`)}>
              <span className="pos">
                {String(s.pos).padStart(2, "0")} <Delta value={s.delta} />
              </span>
              <span className="who">
                <Avatar name={s.name} />
                <span>
                  <span className="tier" style={tierVar(tier.color)}>
                    {tier.label}
                  </span>
                  <span className="nm">{s.name}</span>
                </span>
              </span>
              <span className="c">{s.played}</span>
              <span className="c">{s.wins}</span>
              <span className="c">{s.draws}</span>
              <span className="c">{s.losses}</span>
              <span className="c">{s.diff > 0 ? `+${s.diff}` : s.diff}</span>
              <span className="c">{s.played ? `${Math.round(s.winRate * 100)}` : "—"}</span>
              <span className="pts">{s.points}</span>
              <span>
                <FormDots form={s.form} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export const winnerSide = (m: Match) => (m.scoreA > m.scoreB ? "A" : m.scoreB > m.scoreA ? "B" : null);
export const modeLabel = (m: Match) => (isSolo(m) ? "1x1" : "2x2");

export function Score({ m }: { m: Match }) {
  const w = winnerSide(m);
  return (
    <span className="score num" aria-label={`${m.scoreA} a ${m.scoreB}`}>
      <b className={w === "A" ? "w" : ""}>{m.scoreA}</b>
      <b className={w === "B" ? "w" : ""}>{m.scoreB}</b>
    </span>
  );
}

/** Compact two-line match card (dashboard sidebar, profile). */
export function MatchCard({ m }: { m: Match }) {
  const { href } = useMode();
  const w = winnerSide(m);
  const line = (team: string[], score: number, side: "A" | "B") => (
    <span className="line">
      <span className={`t ${w && w !== side ? "lost" : ""}`}>
        <Stack team={team} size="sm" />
        <span>{teamLabel(team)}</span>
      </span>
      <b className={`num ${w === side ? "w" : ""}`}>{score}</b>
    </span>
  );
  return (
    <Link className="vs" href={href(`/partidas/${m.id}`)}>
      <span className="meta">
        <span>
          {formatDate(m.date)} · {modeLabel(m)}
        </span>
        <span>{m.location || "Sem local"}</span>
      </span>
      {line(m.teamA, m.scoreA, "A")}
      {line(m.teamB, m.scoreB, "B")}
    </Link>
  );
}

/** Full-width history row. */
export function MatchRow({ m }: { m: Match }) {
  const { href } = useMode();
  const w = winnerSide(m);
  return (
    <Link className="mrow" href={href(`/partidas/${m.id}`)}>
      <span className={`t ${w === "B" ? "lost" : ""}`}>
        <Stack team={m.teamA} size="sm" />
        <span>{teamLabel(m.teamA)}</span>
      </span>
      <Score m={m} />
      <span className={`t r ${w === "A" ? "lost" : ""}`}>
        <span>{teamLabel(m.teamB)}</span>
        <Stack team={m.teamB} size="sm" />
      </span>
      <span className="mode-tag">{modeLabel(m)}</span>
      <ChevronRight size={18} />
    </Link>
  );
}

const FACT_ICONS: Record<FactIcon, LucideIcon> = {
  target: Target,
  flag: Flag,
  zap: Zap,
  flame: Flame,
  crown: Crown,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  snowflake: Snowflake,
  sparkles: Sparkles,
  goal: Goal,
  medal: Medal,
  shield: Shield,
  swords: Swords,
  handshake: Handshake,
  "map-pin": MapPin,
  party: PartyPopper,
  "brick-wall": BrickWall,
  "shield-alert": ShieldAlert,
  chart: BarChart3,
  repeat: Repeat,
  skull: Skull,
};

export function FactIconView({ name, size = 18 }: { name: FactIcon; size?: number }) {
  const Icon = FACT_ICONS[name] ?? Sparkles;
  return <Icon size={size} aria-hidden />;
}

export function FactList({ facts, compact }: { facts: Fact[]; compact?: boolean }) {
  return (
    <ul className={`facts${compact ? " compact" : ""}`}>
      {facts.map((f, i) => (
        <li key={i}>
          <span className="ic">
            <FactIconView name={f.icon} />
          </span>
          <span>{f.text}</span>
        </li>
      ))}
    </ul>
  );
}
