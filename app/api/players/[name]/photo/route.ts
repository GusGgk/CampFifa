import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { DATA_TAG } from "@/lib/data";
import { getPhoto, PHOTO_TYPES, removePhoto, savePhoto, type PhotoType } from "@/lib/db";
import { pinOk } from "@/lib/auth";
import { PLAYERS } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_BYTES = 300 * 1024;

type Ctx = { params: Promise<{ name: string }> };

async function playerFrom(ctx: Ctx) {
  const name = decodeURIComponent((await ctx.params).name);
  return (PLAYERS as readonly string[]).includes(name) ? name : null;
}

// The upload must really be the image type it claims, so we never serve something else as an image.
function looksLike(type: PhotoType, b: Buffer) {
  if (type === "image/png") return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  return b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP";
}

export async function GET(_req: Request, ctx: Ctx) {
  const name = await playerFrom(ctx);
  const photo = name && (await getPhoto(name));
  if (!photo) return NextResponse.json({ error: "Sem foto" }, { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "content-type": photo.type,
      "x-content-type-options": "nosniff",
      // URLs carry ?v=<version>, so a new upload gets a new URL.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

export async function PUT(req: Request, ctx: Ctx) {
  if (!pinOk(req)) return NextResponse.json({ error: "PIN incorreto" }, { status: 401 });
  const name = await playerFrom(ctx);
  if (!name) return NextResponse.json({ error: "Jogador desconhecido" }, { status: 404 });
  const type = req.headers.get("content-type") as PhotoType;
  if (!(type in PHOTO_TYPES)) return NextResponse.json({ error: "Envie uma imagem WebP, PNG ou JPEG" }, { status: 415 });
  const data = Buffer.from(await req.arrayBuffer());
  if (!data.length || data.length > MAX_BYTES) {
    return NextResponse.json({ error: "A foto precisa ter até 300 KB" }, { status: 413 });
  }
  if (!looksLike(type, data)) return NextResponse.json({ error: "Arquivo de imagem inválido" }, { status: 400 });
  await savePhoto(name, { data, type });
  revalidateTag(DATA_TAG);
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(req: Request, ctx: Ctx) {
  if (!pinOk(req)) return NextResponse.json({ error: "PIN incorreto" }, { status: 401 });
  const name = await playerFrom(ctx);
  if (!name) return NextResponse.json({ error: "Jogador desconhecido" }, { status: 404 });
  await removePhoto(name);
  revalidateTag(DATA_TAG);
  return new NextResponse(null, { status: 204 });
}
