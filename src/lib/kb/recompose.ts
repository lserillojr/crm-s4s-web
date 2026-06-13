import { callAiService } from "@/lib/api/ai-service";
import { composeKb } from "@/lib/kb/compose";
import { resolveStagePlaceholders } from "@/lib/kb/placeholders";
import { fetchRoleToName } from "@/lib/funil/role-to-name";
import type { KbSection } from "@/lib/kb/types";

type GetRaw = {
  sections: KbSection[] | null;
  vertical: string | null;
  legacyContent: string | null;
};

/**
 * Recompõe o `ai_kb_content` resolvendo `{{etapa:role}}` contra os labels atuais e salva.
 * Best-effort: chamado após um rename (2B) para manter a Seção 8 do KB em sincronia com os
 * novos labels. Pula se o tenant ainda não tem KB materializado (`sections==null`) — o
 * provisionamento/1ª edição cuidam disso. Nunca lança: qualquer falha → `{recomposed:false}`.
 */
export async function recomposeAndSaveKb(tenantId: string): Promise<{ recomposed: boolean }> {
  const raw = await callAiService<GetRaw>({ path: "/kb/api/v1/get", body: { tenant_id: tenantId } });
  if (!raw.ok) {
    console.warn("[kb] recompose: get indisponível", { tenantId });
    return { recomposed: false };
  }
  const sections = raw.data.sections;
  if (!sections) return { recomposed: false }; // sem KB materializado → nada a sincronizar
  const roleToName = await fetchRoleToName(tenantId);
  const content = resolveStagePlaceholders(composeKb(sections), roleToName);
  const saved = await callAiService<{ ok: boolean }>({
    path: "/kb/api/v1/save",
    body: { tenant_id: tenantId, sections, content },
  });
  if (!saved.ok) {
    console.warn("[kb] recompose: save falhou", { tenantId });
    return { recomposed: false };
  }
  return { recomposed: true };
}
