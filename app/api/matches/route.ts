import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { DATA_TAG } from "@/lib/data";
import { insertMatch, listMatches } from "@/lib/db";
import { pinOk } from "@/lib/auth";
import { PLAYERS, type NewMatch } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listMatches());
}

function parse(body: unknown): NewMatch | string {
  const b = body as Partial<NewMatch>;
  const valid = new Set<string>(PLAYERS);
  const team = (t: unknown) =>
    Array.isArray(t) && t.length >= 1 && t.length <= 2 && t.every((p) => valid.has(p));
  if (!b || typeof b.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return "Data inválida";
  if (!team(b.teamA) || !team(b.teamB)) return "Escolha 1 ou 2 jogadores por time";
  const a = b.teamA as string[];
  const t = b.teamB as string[];
  if (a.some((p) => t.includes(p))) return "Um jogador não pode estar nos dois times";
  const score = (s: unknown) => Number.isInteger(s) && (s as number) >= 0 && (s as number) <= 99;
  if (!score(b.scoreA) || !score(b.scoreB)) return "Placar inválido";
  return {
    date: b.date,
    location: String(b.location ?? "").trim().slice(0, 60),
    teamA: a,
    teamB: t,
    scoreA: b.scoreA as number,
    scoreB: b.scoreB as number,
  };
}

export async function POST(req: Request) {
  if (!pinOk(req)) return NextResponse.json({ error: "PIN incorreto" }, { status: 401 });
  const parsed = parse(await req.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
  const match = await insertMatch(parsed);
  revalidateTag(DATA_TAG);
  return NextResponse.json(match, { status: 201 });
}
