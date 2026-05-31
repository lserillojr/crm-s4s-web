/** Template genérico (vertical "outro" e fallback). Corpos curtos; o Vinicius refina. */
export const outroTemplate: Record<string, string> = {
  identidade: "Descreva seu negócio: o que você faz, para quem, e o tom de voz.",
  metodologia: "Como você trabalha / entrega o serviço.",
  servicos: "Liste seus serviços/produtos com preço e observações.",
  playbook: "1. Cumprimente pelo nome. 2. Entenda a necessidade (uma pergunta por vez). 3. Recomende. 4. Agende/feche o próximo passo.",
  faq: "Perguntas frequentes e respostas.",
  escalacao: "Escale para um humano quando: pedir desconto fora da tabela, reclamar, pedir nota fiscal/CNPJ, ou demonstrar irritação.",
  diretrizes: "Responda todas as mensagens. Uma pergunta por mensagem. Não reabra o que já foi respondido. Não insista.",
  anti_loop: "Nunca repetir saudação na mesma conversa. Não inventar promoções. Não citar concorrentes. Não pedir CPF/RG.",
  regras_odoo: "Mova o lead: Novo → Em Contato (qualificando) → Orçamento (apresentou preço) → Fechado/Perdido. Sempre execute a API odoo ao mover. Perdido exige motivo: preco|sem_fit|sem_resposta|no_show|concorrente|outro.",
};
