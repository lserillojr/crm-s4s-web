// src/lib/api/conversations-service.ts
import { getPool } from "@/lib/db/pool";
import { getTenantChatwootCreds } from "@/lib/db/tenants";
import { env } from "@/lib/env";
import { createChatwootClient, type ChatwootClient } from "./chatwoot-client";

/** Resolve um cliente Chatwoot autenticado para o tenant. Lança se faltar config. */
export async function chatwootForTenant(tenantId: string): Promise<ChatwootClient> {
  const creds = await getTenantChatwootCreds(getPool(), tenantId);
  if (!creds) throw new Error("tenant sem credenciais chatwoot");
  const baseUrl = env.CHATWOOT_BASE_URL;
  if (!baseUrl) throw new Error("CHATWOOT_BASE_URL ausente");
  return createChatwootClient({ baseUrl, accountId: creds.accountId, token: creds.apiToken });
}
