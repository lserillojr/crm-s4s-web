import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getPool } from "@/lib/db/pool";
import { getRequiredGlobalConfig } from "@/lib/config/global-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 10_000;

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return Response.json({ error: "unauth" }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT evolution_instance FROM tenants WHERE id = $1`,
    [session.user.tenantId]
  );
  const instanceName = (rows[0]?.evolution_instance as string | null) ?? null;
  if (!instanceName) {
    return Response.json({ error: "no_instance_provisioned" }, { status: 500 });
  }

  const baseUrl = await getRequiredGlobalConfig(pool, "evolution_api_base_url");
  const apiKey = await getRequiredGlobalConfig(pool, "evolution_api_key");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/instance/connect/${encodeURIComponent(instanceName)}`;
    const resp = await fetch(url, {
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const code = resp.status === 404 ? "instance_missing" : "evolution_unreachable";
      console.warn(`[whatsapp/qr] Evolution ${resp.status}`, {
        tenantId: session.user.tenantId,
        instanceName,
        code,
      });
      return Response.json({ error: code }, { status: 503 });
    }

    const data = (await resp.json()) as { code?: string; base64?: string };
    return Response.json(
      {
        qrcode: data.base64 ?? "",
        pairingCode: data.code ?? "",
        expiresInSeconds: 60,
      },
      { status: 200 }
    );
  } catch (err) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.warn("[whatsapp/qr] Evolution fetch failed", {
      tenantId: session.user.tenantId,
      isAbort,
    });
    return Response.json({ error: "evolution_unreachable" }, { status: 503 });
  }
}
