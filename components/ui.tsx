import type { CSSProperties } from "react";
import { PLAYERS } from "@/lib/types";
import type { Outcome } from "@/lib/stats";

/** Each player owns one categorical slot, so their color never changes with rank or filters. */
export function playerColor(name: string) {
  const i = PLAYERS.indexOf(name as (typeof PLAYERS)[number]);
  return i >= 0 ? `var(--series-${i + 1})` : "var(--muted)";
}

export const colorVar = (name: string) => ({ "--c": playerColor(name) }) as CSSProperties;

export function Avatar({ name, small }: { name: string; small?: boolean }) {
  return (
    <span className={`avatar${small ? " sm" : ""}`} style={colorVar(name)} aria-hidden>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function Stack({ team }: { team: string[] }) {
  return (
    <span className="stack">
      {team.map((p) => (
        <Avatar key={p} name={p} small />
      ))}
    </span>
  );
}

const outcomeLabel: Record<Outcome, string> = { V: "Vitória", E: "Empate", D: "Derrota" };

export function FormDots({ form }: { form: Outcome[] }) {
  if (!form.length) return <span>—</span>;
  return (
    <span className="form-dots">
      {form.map((r, i) => (
        <span key={i} className={`dot ${r}`} title={outcomeLabel[r]}>
          {r}
        </span>
      ))}
    </span>
  );
}
