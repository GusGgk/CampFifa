"use client";

import { useMemo } from "react";
import Link from "next/link";
import { pct, standings } from "@/lib/stats";
import { PLAYERS } from "@/lib/types";
import { useFilteredMatches, useMode } from "../AppProvider";
import { Avatar, tierOf, tierVar } from "../ui";

export default function PlayersView() {
  const { href } = useMode();
  const ms = useFilteredMatches();
  const rows = useMemo(() => standings(ms), [ms]);

  return (
    <main className="page">
      <div className="page-h">
        <div>
          <h1>Jogadores</h1>
          <p>Perfil, conquistas, retrospecto e foto de cada um</p>
        </div>
      </div>
      <div className="roster">
        {PLAYERS.map((name) => {
          const s = rows.find((r) => r.name === name)!;
          const tier = tierOf(s.pos, rows.length, s.played);
          return (
            <Link key={name} href={href(`/jogadores/${name}`)} style={tierVar(tier.color)}>
              <Avatar name={name} size="lg" />
              <span>
                <span className="tier" style={tierVar(tier.color)}>
                  {tier.label}
                </span>
                <span className="nm">{name}</span>
                <span className="meta num">
                  {s.played ? `${s.pos}º · ${pct(s.winRate)} · ${s.wins}V ${s.draws}E ${s.losses}D` : "Sem jogos neste modo"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
