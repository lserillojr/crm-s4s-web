import { requireAppUser } from "@/lib/api/require-app-user";
import { callAgendaService } from "@/lib/ai-service";
import { ContactSearchResult } from "@/lib/agenda/contract";
import type { AppContatoDTO } from "@/lib/agenda/app-contract";
import { upstreamError } from "@/lib/api/upstream-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** GET /api/app/agenda/contacts/search?term= — autocomplete de contato (min 2 chars). */
export async function GET(req: Request) {
  const ctx = await requireAppUser(req);
  if ("response" in ctx) return ctx.response;

  const term = (new URL(req.url).searchParams.get("term") || "").trim();
  if (term.length < 2) return Response.json([], { headers: NO_STORE });

  try {
    const r = await callAgendaService(
      `/agenda/contacts/search?tenant=${encodeURIComponent(ctx.tenantId)}&term=${encodeURIComponent(term)}`,
    );
    if (!r.ok) return upstreamError(`agenda/contacts upstream status ${r.status}`);
    const { results } = ContactSearchResult.parse(await r.json());
    const limpo: AppContatoDTO[] = results.map((c) => ({ id: c.id, nome: c.name, telefone: c.phone ?? null }));
    return Response.json(limpo, { headers: NO_STORE });
  } catch (e) {
    return upstreamError(e);
  }
}
