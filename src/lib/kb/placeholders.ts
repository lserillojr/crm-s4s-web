const PLACEHOLDER_RE = /\{\{\s*etapa:([a-z_]+)\s*\}\}/g;

/**
 * Troca `{{etapa:<role>}}` pelo label atual da `crm.stage` do tenant (map papel→nome).
 * Papel ausente no funil do tenant → string vazia (omitido), logado. Texto fora de
 * placeholders fica intacto. Pura (sem I/O) — o map vem de fetchRoleToName.
 */
export function resolveStagePlaceholders(
  md: string,
  roleToName: Record<string, string>,
): string {
  return md.replace(PLACEHOLDER_RE, (_full, role: string) => {
    const name = roleToName[role];
    if (!name) {
      console.warn("[kb] placeholder de papel ausente no funil", { role });
      return "";
    }
    return name;
  });
}
