import { requireAppUser } from "@/lib/api/require-app-user";
import { upstreamError } from "@/lib/api/upstream-error";
import { chatwootForTenant } from "@/lib/api/conversations-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/app/conversations/[id]/attachments/[attId]
 * Proxy genérico (imagem e áudio) da Fase B. requireAppUser resolve o tenant
 * pelo claim; a credencial do Chatwoot (api_access_token) fica no BFF — só o
 * data_url assinado do Active Storage é baixado e re-emitido em streaming.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string; attId: string } },
) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;

  const convId = Number(params.id);
  const attId = Number(params.attId);
  if (!Number.isInteger(convId) || convId <= 0 || !Number.isInteger(attId) || attId <= 0) {
    return Response.json({ error: "bad_id" }, { status: 400, headers: NO_STORE });
  }

  try {
    const cw = await chatwootForTenant(ctx.tenantId);
    const url = await cw.getAttachmentUrl(convId, attId);
    if (!url) return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

    const upstream = await fetch(url, { redirect: "follow" });
    if (!upstream.ok || !upstream.body) {
      return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
    }
    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    // Mídia é imutável por attachment → cache privado curto no device.
    return new Response(upstream.body, {
      status: 200,
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
    });
  } catch (e) {
    return upstreamError(e);
  }
}
