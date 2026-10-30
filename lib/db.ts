import { neon } from "@neondatabase/serverless";
import { promises as fs } from "fs";
import path from "path";
import type { Match, NewMatch } from "./types";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
const sql = url ? neon(url) : null;

export const CONFIG_ERROR = "DATABASE_URL não configurada";

// Without a database (local dev only) matches live in data/matches.json.
const LOCAL_FILE = path.join(process.cwd(), "data", "matches.json");

const LOCAL_PHOTOS = path.join(process.cwd(), "data", "photos");

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
    )`.then(
    () => sql`
      CREATE TABLE IF NOT EXISTS players (
        name TEXT PRIMARY KEY,
        photo TEXT,
        photo_type TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
  );
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
  if (process.env.VERCEL) throw new Error(CONFIG_ERROR);
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

// ---------- player photos (small images, stored as base64 next to the matches) ----------

export const PHOTO_TYPES = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" } as const;
export type PhotoType = keyof typeof PHOTO_TYPES;
export type Photo = { data: Buffer; type: PhotoType };

async function findLocalPhoto(name: string) {
  for (const [type, ext] of Object.entries(PHOTO_TYPES)) {
    const file = path.join(LOCAL_PHOTOS, `${name}.${ext}`);
    try {
      return { file, type: type as PhotoType, stat: await fs.stat(file) };
    } catch {}
  }
  return null;
}

/** Version token per player that has a photo; it changes on every upload so URLs can be cached forever. */
export async function listPhotoVersions(): Promise<Record<string, string>> {
  if (!sql) {
    if (process.env.VERCEL) throw new Error(CONFIG_ERROR);
    const out: Record<string, string> = {};
    for (const file of await fs.readdir(LOCAL_PHOTOS).catch(() => [] as string[])) {
      const stat = await fs.stat(path.join(LOCAL_PHOTOS, file));
      out[file.replace(/\.[^.]+$/, "")] = String(Math.round(stat.mtimeMs));
    }
    return out;
  }
  await ensureSchema();
  const rows = (await sql`
    SELECT name, (extract(epoch FROM updated_at) * 1000)::bigint::text AS v
    FROM players WHERE photo IS NOT NULL`) as { name: string; v: string }[];
  return Object.fromEntries(rows.map((r) => [r.name, r.v]));
}

export async function getPhoto(name: string): Promise<Photo | null> {
  if (!sql) {
    const found = await findLocalPhoto(name);
    return found ? { data: await fs.readFile(found.file), type: found.type } : null;
  }
  await ensureSchema();
  const [row] = (await sql`SELECT photo, photo_type FROM players WHERE name = ${name} AND photo IS NOT NULL`) as {
    photo: string;
    photo_type: PhotoType;
  }[];
  return row ? { data: Buffer.from(row.photo, "base64"), type: row.photo_type } : null;
}

export async function savePhoto(name: string, photo: Photo) {
  if (!sql) {
    await removePhoto(name);
    await fs.mkdir(LOCAL_PHOTOS, { recursive: true });
    await fs.writeFile(path.join(LOCAL_PHOTOS, `${name}.${PHOTO_TYPES[photo.type]}`), photo.data);
    return;
  }
  await ensureSchema();
  await sql`
    INSERT INTO players (name, photo, photo_type, updated_at)
    VALUES (${name}, ${photo.data.toString("base64")}, ${photo.type}, now())
    ON CONFLICT (name) DO UPDATE SET photo = EXCLUDED.photo, photo_type = EXCLUDED.photo_type, updated_at = now()`;
}

export async function removePhoto(name: string) {
  if (!sql) {
    const found = await findLocalPhoto(name);
    if (found) await fs.unlink(found.file);
    return;
  }
  await ensureSchema();
  await sql`UPDATE players SET photo = NULL, photo_type = NULL, updated_at = now() WHERE name = ${name}`;
}
