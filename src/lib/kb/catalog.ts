/**
 * Catálogo canônico dos blocos da KB (ordem = ordem de composição).
 * Derivado da KB real do Vinicius (HML hml-demo-ingles "BZK English").
 * editable=true → MEI edita na tela /settings/kb. editable=false → travado
 * (engenharia conversacional + funil; só a equipe S4S altera, por ora via SQL).
 */
export const KB_CATALOG = [
  { key: "identidade", title: "Identidade e tom", editable: true },
  { key: "metodologia", title: "Metodologia", editable: true },
  { key: "servicos", title: "Serviços e produtos", editable: true },
  { key: "playbook", title: "Playbook de qualificação", editable: false },
  { key: "faq", title: "FAQ (perguntas frequentes)", editable: true },
  { key: "escalacao", title: "Quando escalar para um humano", editable: false },
  { key: "diretrizes", title: "Diretrizes gerais", editable: false },
  { key: "anti_loop", title: "Regras anti-loop e proteções", editable: false },
  { key: "regras_odoo", title: "Regras do funil (movimentação do pipeline)", editable: false },
] as const;

export const EDITABLE_KEYS = KB_CATALOG.filter((s) => s.editable).map((s) => s.key);
