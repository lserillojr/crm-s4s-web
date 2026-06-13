// Significado fixo (em linguagem do MEI) de cada papel do funil. O `name` da etapa é
// o que o MEI edita; o significado abaixo é só rótulo de orientação na tela — read-only.
// Papéis = crm.stage.s4s_role (addon s4s_embed, funnel_templates.py).
export const ROLE_MEANINGS: Record<string, string> = {
  novo: "Cliente novo — acabou de chegar",
  em_contato: "Conversa iniciada com o cliente",
  orcamento: "Orçamento ou proposta enviada",
  agendado: "Visita, aula ou avaliação marcada",
  reagendado: "Remarcado para outra data",
  negociacao: "Negociando o fechamento",
  venda: "Venda fechada",
  aguardando: "Aguardando resposta do cliente",
  perdido: "Não fechou ou desistiu",
};

// Ordem natural do funil (fallback de empate quando o `sequence` do Odoo coincide).
export const ROLE_ORDER: string[] = [
  "novo", "em_contato", "orcamento", "agendado", "reagendado",
  "negociacao", "venda", "aguardando", "perdido",
];

export function meaningForRole(role: string | null | undefined): string {
  if (!role) return "";
  return ROLE_MEANINGS[role] ?? "";
}
