import { timingSafeEqual } from "crypto";

// Writes are guarded by a shared group PIN. No PIN configured = open (local dev).
export function pinOk(req: Request) {
  const expected = process.env.APP_PIN;
  if (!expected) return !process.env.VERCEL;
  const given = req.headers.get("x-app-pin") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
