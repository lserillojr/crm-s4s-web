// src/lib/api/upstream-error.ts
// 502 padronizado para as rotas /api/app/* — nunca vaza detalhes do upstream
// (conexões, secrets, stack) ao device. O detalhe vai só para o log do servidor.
const NO_STORE = { "Cache-Control": "no-store" };

export function upstreamError(e: unknown): Response {
  console.error("[app-bff] upstream error:", e);
  return Response.json({ error: "upstream" }, { status: 502, headers: NO_STORE });
}
