// src/lib/api/conversations-service.ts
import { getPool } from "@/lib/db/pool";
import { getTenantChatwootCreds } from "@/lib/db/tenants";
import { env } from "@/lib/env";
import { callAiService } from "./ai-service";
import { createChatwootClient, type ChatwootClient } from "./chatwoot-client";

/** Resolve um cliente Chatwoot autenticado para o tenant. Lança se faltar config. */
export async function chatwootForTenant(tenantId: string): Promise<ChatwootClient> {
  const creds = await getTenantChatwootCreds(getPool(), tenantId);
  if (!creds) throw new Error("tenant sem credenciais chatwoot");
  const baseUrl = env.CHATWOOT_BASE_URL;
  if (!baseUrl) throw new Error("CHATWOOT_BASE_URL ausente");
  return createChatwootClient({ baseUrl, accountId: creds.accountId, token: creds.apiToken });
}

/**
 * Marca a oportunidade da conversa como **vendida** (evento humano `venda_fechada`):
 * move o funil para Venda Fechada (role `venda`) e grava o faturamento R$. Reusa o
 * `/stage` do WF08 (resolve por `s4s_role`, idempotente/forward-only). A IA **nunca**
 * emite este evento — só o dono via BFF autenticado. Lança em falha de upstream para
 * a rota mapear 502 (não vaza detalhe ao device).
 */
export async function marcarVendido(
  tenantId: string,
  conversationId: number,
  valorBrl: number | null,
): Promise<{ success?: boolean; moved?: boolean; reason?: string | null }> {
  const creds = await getTenantChatwootCreds(getPool(), tenantId);
  if (!creds) throw new Error("tenant sem credenciais chatwoot");
  const res = await callAiService<{ success?: boolean; moved?: boolean; reason?: string | null }>({
    path: "/ai-tools/v1/stage",
    method: "POST",
    body: {
      account_id: creds.accountId,
      conversation_id: conversationId,
      evento: "venda_fechada",
      valor_brl: valorBrl,
      resumo: "marcado como vendido pelo dono",
    },
  });
  if (!res.ok) {
    throw new Error(`stage upstream failed: ${res.reason}`);
  }
  return res.data;
}
