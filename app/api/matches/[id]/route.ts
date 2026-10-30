import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { DATA_TAG } from "@/lib/data";
import { deleteMatch } from "@/lib/db";
import { pinOk } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!pinOk(req)) return NextResponse.json({ error: "PIN incorreto" }, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  await deleteMatch(id);
  revalidateTag(DATA_TAG);
  return new NextResponse(null, { status: 204 });
}
