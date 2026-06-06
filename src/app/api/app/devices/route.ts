import { z } from "zod";
import { requireAppUser } from "@/lib/api/require-app-user";
import { getPool } from "@/lib/db/pool";
import { upsertDeviceToken, deleteDeviceToken } from "@/lib/db/device-tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

const RegisterSchema = z.object({ token: z.string().min(1), platform: z.enum(["android", "ios"]) });
const UnregisterSchema = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;
  const parsed = RegisterSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  await upsertDeviceToken(getPool(), { userId: ctx.userId, token: parsed.data.token, platform: parsed.data.platform });
  return Response.json({ ok: true }, { status: 200, headers: NO_STORE });
}

export async function DELETE(req: Request) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;
  const parsed = UnregisterSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  await deleteDeviceToken(getPool(), parsed.data.token, ctx.userId);
  return Response.json({ ok: true }, { status: 200, headers: NO_STORE });
}
