import { callAiService } from "@/lib/api/ai-service";
import { funilGetResponseSchema } from "@/lib/funil/schema";

const GET_PATH = "/funil-config/api/v1/get";

/**
 * Map papel→label atual das etapas do tenant, reusando o WF funil-config (2B).
 * Falha/degradação → map vazio (placeholders então resolvem para vazio). Etapas sem
 * `s4s_role` são puladas; em papel duplicado (backfill parcial — ver memória), o
 * primeiro vence. Não lança: o caller (compose do KB) deve degradar.
 */
export async function fetchRoleToName(tenantId: string): Promise<Record<string, string>> {
  const result = await callAiService<unknown>({ path: GET_PATH, body: { tenant_id: tenantId } });
  if (!result.ok) {
    console.warn("[kb] funil-config indisponível p/ resolver etapas", {
      tenantId,
      reason: result.reason,
    });
    return {};
  }
  const parsed = funilGetResponseSchema.safeParse(result.data);
  if (!parsed.success) return {};
  const map: Record<string, string> = {};
  for (const s of parsed.data.stages) {
    if (s.s4s_role && !(s.s4s_role in map)) map[s.s4s_role] = s.name;
  }
  return map;
}
