import { requireApiTenant } from "@/lib/api/require-tenant";
import { callAgendaService } from "@/lib/ai-service";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Aviso mostrado ao MEI quando o estruturador recusa o conteúdo por tamanho
 * (>10MB → 413). Em vez de quebrar a tela, devolvemos 200 com lista vazia e o
 * aviso — a tela já destaca `warnings` na revisão.
 */
const TOO_LARGE_WARNING =
  "O arquivo é grande demais (limite de 10MB). Tente enviar um arquivo menor ou cole o texto.";

type IngestResult = {
  products: unknown[];
  warnings: string[];
};

function tooLargeResult(): Response {
  return Response.json(
    { products: [], warnings: [TOO_LARGE_WARNING] } satisfies IngestResult,
    { status: 200, headers: NO_STORE },
  );
}

/**
 * POST /api/catalogo/ingest
 *
 * Aceita `multipart/form-data` (campo `file`) OU JSON `{ text }`. Resolve o
 * tenant via sessão (`requireApiTenant`) — NUNCA confia em tenant vindo do body.
 * Encaminha ao estruturador do crm-s4s-ai (mesmo canal x-agenda-secret da
 * agenda) e devolve `{ products, warnings }` SEM persistir: os drafts vivem no
 * cliente até o MEI publicar (POST /api/catalogo com isActive=true).
 *
 * Contrato do estruturador:
 *   texto   → POST /catalog/structure        { content, tenant_id }
 *   arquivo → POST /catalog/structure/file    multipart: file + tenant_id
 * Ambos devolvem { products: ProductDraft[], warnings: string[] }.
 * 413 (vazio/>10MB) é tratado graciosamente como 200 + warning.
 */
export async function POST(req: Request) {
  const ctx = await requireApiTenant();
  if ("response" in ctx) return ctx.response;

  const contentType = req.headers.get("content-type") ?? "";

  // ── Caminho ARQUIVO (multipart) ───────────────────────────────────────────
  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return Response.json(
        { error: "invalid_form" },
        { status: 400, headers: NO_STORE },
      );
    }

    // Duck-typing em vez de `instanceof File`: sob undici/jsdom o File do form
    // pode vir de outro realm (instanceof falha), mas continua sendo um Blob
    // com nome. Aceitamos qualquer Blob-like com `arrayBuffer`.
    const file = form.get("file");
    const isFileLike =
      file !== null &&
      typeof file !== "string" &&
      typeof (file as Blob).arrayBuffer === "function";
    if (!isFileLike) {
      return Response.json(
        { error: "missing_file" },
        { status: 400, headers: NO_STORE },
      );
    }
    const blob = file as Blob;
    const filename =
      typeof (file as File).name === "string" && (file as File).name
        ? (file as File).name
        : "catalogo";

    const base = env.AI_SERVICE_BASE_URL;
    const secret = env.AI_SERVICE_SECRET;
    if (!base || !secret) {
      console.warn("[catalogo/ingest] AI_SERVICE_BASE_URL/SECRET ausentes");
      return Response.json(
        { error: "upstream" },
        { status: 502, headers: NO_STORE },
      );
    }

    // Re-embrulha em um Blob do realm atual antes de re-anexar. Sob undici/jsdom
    // o Blob vindo do form pode ser de outro realm e o FormData.append recusa;
    // copiar os bytes normaliza o realm (no-op funcional em produção).
    const bytes = await blob.arrayBuffer();
    const normalized = new Blob([bytes], {
      type: blob.type || "application/octet-stream",
    });

    const upstream = new FormData();
    upstream.append("file", normalized, filename);
    upstream.append("tenant_id", ctx.tenantId); // sempre da sessão

    try {
      // Multipart: NÃO definir content-type manualmente (o fetch monta o
      // boundary). Por isso usamos fetch direto reaproveitando base+secret do
      // mesmo canal da agenda, em vez do callAgendaService (que força JSON).
      const r = await fetch(`${base}/catalog/structure/file`, {
        method: "POST",
        headers: { "x-agenda-secret": secret },
        body: upstream,
        cache: "no-store",
      });
      return relayStructurerResponse(r, ctx.tenantId);
    } catch (err) {
      console.warn("[catalogo/ingest file] erro", {
        tenantId: ctx.tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
      return Response.json(
        { error: "upstream" },
        { status: 502, headers: NO_STORE },
      );
    }
  }

  // ── Caminho TEXTO (JSON) ──────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "invalid_json" },
      { status: 400, headers: NO_STORE },
    );
  }

  const text =
    typeof body === "object" && body !== null && "text" in body
      ? (body as { text?: unknown }).text
      : undefined;

  if (typeof text !== "string" || text.trim() === "") {
    return Response.json(
      { error: "missing_content" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const r = await callAgendaService("/catalog/structure", {
      method: "POST",
      body: JSON.stringify({ content: text, tenant_id: ctx.tenantId }),
    });
    return relayStructurerResponse(r, ctx.tenantId);
  } catch (err) {
    console.warn("[catalogo/ingest text] erro", {
      tenantId: ctx.tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json(
      { error: "upstream" },
      { status: 502, headers: NO_STORE },
    );
  }
}

/**
 * Traduz a resposta do estruturador para o cliente:
 *  - 413 → 200 com lista vazia + warning (graceful)
 *  - !ok  → 502 (a tela mostra erro genérico)
 *  - ok   → repassa { products, warnings } intactos (sem persistir)
 */
async function relayStructurerResponse(
  r: Response,
  tenantId: string,
): Promise<Response> {
  if (r.status === 413) return tooLargeResult();

  if (!r.ok) {
    console.warn("[catalogo/ingest] estruturador respondeu erro", {
      tenantId,
      status: r.status,
    });
    return Response.json(
      { error: "upstream" },
      { status: 502, headers: NO_STORE },
    );
  }

  const data = (await r.json()) as Partial<IngestResult>;
  return Response.json(
    {
      products: Array.isArray(data.products) ? data.products : [],
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
    } satisfies IngestResult,
    { status: 200, headers: NO_STORE },
  );
}
