"use client";

import { useRef, useState } from "react";
import { PLAYERS, type Match } from "@/lib/types";
import { formatDate, headToHead, pct, winRateTimeline, type PlayerStats } from "@/lib/stats";
import { Avatar, colorVar, playerColor } from "./ui";

const W = 640;
const H = 240;
const M = { l: 36, r: 64, t: 14, b: 26 };

/** `focus` highlights one player and fades the others (player profile). */
export function WinRateChart({ matches, focus }: { matches: Match[]; focus?: string }) {
  const data = winRateTimeline(matches);
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const active = PLAYERS.filter((p) => data.some((d) => d.rates[p] != null));

  if (data.length < 2) {
    return <p className="muted">Registre pelo menos 2 partidas para ver a evolução.</p>;
  }

  const n = data.length;
  const x = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - v) * (H - M.t - M.b);

  const paths = active.map((p) => {
    let d = "";
    data.forEach((pt, i) => {
      const v = pt.rates[p];
      if (v == null) return;
      d += `${d ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    });
    return { p, d };
  });

  // End labels, nudged apart so they never overlap.
  const ends = active
    .map((p) => ({ p, v: data[n - 1].rates[p] as number, y: y(data[n - 1].rates[p] as number) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 14);

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = n <= 8 ? data.map((_, i) => i) : [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((vx - M.l) / (W - M.l - M.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  const h = hover != null ? data[hover] : null;
  const width = wrap.current?.clientWidth ?? W;
  const scale = width / W;
  const tipTop = h ? Math.min(...active.map((p) => (h.rates[p] == null ? H : y(h.rates[p] as number)))) : 0;

  return (
    <div className="chart-wrap" ref={wrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Evolução do percentual de vitórias por jogador"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="axis-text">
              {t * 100}%
            </text>
          </g>
        ))}
        {xTicks.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="axis-text">
            #{i + 1}
          </text>
        ))}
        {paths.map(({ p, d }) => (
          <path
            key={p}
            d={d}
            fill="none"
            stroke={playerColor(p)}
            strokeWidth={focus === p ? 3 : 2}
            strokeOpacity={focus && focus !== p ? 0.25 : 1}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ transition: "d 0.6s" }}
          />
        ))}
        {ends.map((e) => (
          <g key={e.p}>
            <circle cx={x(n - 1)} cy={y(e.v)} r={4} fill={playerColor(e.p)} stroke="var(--bg)" strokeWidth={2} />
            <text x={x(n - 1) + 10} y={e.y + 4} className="axis-text" style={{ fill: "var(--fg)" }}>
              {e.p}
            </text>
          </g>
        ))}
        {h && hover != null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} stroke="var(--mut)" strokeWidth={1} />
            {active.map((p) =>
              h.rates[p] == null ? null : (
                <circle
                  key={p}
                  cx={x(hover)}
                  cy={y(h.rates[p] as number)}
                  r={5}
                  fill={playerColor(p)}
                  stroke="var(--bg)"
                  strokeWidth={2}
                />
              ),
            )}
          </g>
        )}
        <rect x={M.l} y={0} width={W - M.l - M.r} height={H} fill="transparent" />
      </svg>
      {h && hover != null && (
        <div className="tooltip" style={{ left: x(hover) * scale, top: tipTop * scale }}>
          <div className="t-title">
            Partida #{hover + 1} · {formatDate(h.date)}
          </div>
          {active
            .filter((p) => h.rates[p] != null)
            .sort((a, b) => (h.rates[b] as number) - (h.rates[a] as number))
            .map((p) => (
              <div className="t-row" key={p}>
                <span>
                  <i style={colorVar(p)} />
                  {p}
                </span>
                <b className="num">{pct(h.rates[p] as number)}</b>
              </div>
            ))}
        </div>
      )}
      <div className="legend" style={{ marginTop: 10 }}>
        {active.map((p) => (
          <span key={p}>
            <i style={colorVar(p)} />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GoalsChart({ stats }: { stats: PlayerStats[] }) {
  const rows = stats.filter((s) => s.played > 0);
  if (!rows.length) return <p className="muted">Sem dados ainda.</p>;
  const max = Math.max(1, ...rows.flatMap((s) => [s.gfAvg, s.gaAvg]));
  return (
    <>
      <div className="bars">
        {rows.map((s) => (
          <div className="bar-row" key={s.name}>
            <div className="who">
              <Avatar name={s.name} size="sm" />
              {s.name}
            </div>
            <div className="bar-pair">
              <div className="bar-line" title={`${s.name}: ${s.gf} gols feitos em ${s.played} jogos`}>
                <span className="bar" style={{ width: `${(s.gfAvg / max) * 85}%`, background: playerColor(s.name) }} />
                <span className="bar-val">{s.gfAvg.toFixed(1)}</span>
              </div>
              <div className="bar-line" title={`${s.name}: ${s.ga} gols sofridos em ${s.played} jogos`}>
                <span className="bar" style={{ width: `${(s.gaAvg / max) * 85}%`, background: "var(--mut)", opacity: 0.45 }} />
                <span className="bar-val">{s.gaAvg.toFixed(1)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="legend" style={{ marginTop: 16 }}>
        <span>
          <i style={{ background: "var(--fg)" }} />
          Feitos (cor do jogador)
        </span>
        <span>
          <i style={{ background: "var(--mut)", opacity: 0.45 }} />
          Sofridos
        </span>
      </div>
    </>
  );
}

export function HeadToHead({ matches }: { matches: Match[] }) {
  return (
    <div className="scroll-x">
    <table className="h2h">
      <thead>
        <tr>
          <th />
          {PLAYERS.map((p) => (
            <th key={p}>{p}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {PLAYERS.map((a) => (
          <tr key={a}>
            <th className="rh">{a}</th>
            {PLAYERS.map((b) => {
              if (a === b) return <td key={b} className="self">—</td>;
              const h = headToHead(matches, a, b);
              const rate = h.played ? h.wins / h.played : null;
              // The more orange, the more the row player dominates the column player.
              return (
                <td
                  key={b}
                  style={{ "--h": rate ?? 0 } as React.CSSProperties}
                  title={`${a} contra ${b}: ${h.wins}V ${h.draws}E ${h.losses}D`}
                >
                  {h.wins}-{h.draws}-{h.losses}
                  <small>{rate == null ? "sem jogos" : pct(rate)}</small>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
