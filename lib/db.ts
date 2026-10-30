import { neon } from "@neondatabase/serverless";
import { promises as fs } from "fs";
import path from "path";
import type { Match, NewMatch } from "./types";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
const sql = url ? neon(url) : null;

// Without a database (local dev only) matches live in data/matches.json.
const LOCAL_FILE = path.join(process.cwd(), "data", "matches.json");

let schemaReady: Promise<unknown> | null = null;
function ensureSchema() {
  if (!sql) return Promise.resolve();
  schemaReady ??= sql`
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      played_at DATE NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      team_a TEXT[] NOT NULL,
      team_b TEXT[] NOT NULL,
      score_a INT NOT NULL,
      score_b INT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  return schemaReady;
}

type Row = {
  id: number;
  played_at: string;
  location: string;
  team_a: string[];
  team_b: string[];
  score_a: number;
  score_b: number;
  created_at: string;
};

const fromRow = (r: Row): Match => ({
  id: r.id,
  date: r.played_at,
  location: r.location,
  teamA: r.team_a,
  teamB: r.team_b,
  scoreA: r.score_a,
  scoreB: r.score_b,
  createdAt: r.created_at,
});

async function readLocal(): Promise<Match[]> {
  if (process.env.VERCEL) throw new Error("DATABASE_URL não configurada");
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function writeLocal(matches: Match[]) {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(matches, null, 2));
}

export async function listMatches(): Promise<Match[]> {
  if (!sql) return readLocal();
  await ensureSchema();
  const rows = (await sql`
    SELECT id, played_at::text AS played_at, location, team_a, team_b,
           score_a, score_b, created_at::text AS created_at
    FROM matches ORDER BY played_at, id`) as Row[];
  return rows.map(fromRow);
}

export async function insertMatch(m: NewMatch): Promise<Match> {
  if (!sql) {
    const all = await readLocal();
    const created: Match = {
      ...m,
      id: all.reduce((max, x) => Math.max(max, x.id), 0) + 1,
      createdAt: new Date().toISOString(),
    };
    await writeLocal([...all, created]);
    return created;
  }
  await ensureSchema();
  const [row] = (await sql`
    INSERT INTO matches (played_at, location, team_a, team_b, score_a, score_b)
    VALUES (${m.date}, ${m.location}, ${m.teamA}, ${m.teamB}, ${m.scoreA}, ${m.scoreB})
    RETURNING id, played_at::text AS played_at, location, team_a, team_b,
              score_a, score_b, created_at::text AS created_at`) as Row[];
  return fromRow(row);
}

export async function deleteMatch(id: number) {
  if (!sql) {
    await writeLocal((await readLocal()).filter((m) => m.id !== id));
    return;
  }
  await ensureSchema();
  await sql`DELETE FROM matches WHERE id = ${id}`;
}
