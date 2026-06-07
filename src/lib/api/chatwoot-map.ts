// src/lib/api/chatwoot-map.ts
// Mapeamento PURO (sem I/O) entre o formato cru do Chatwoot e o shape estável
// que o app consome. A indireção que protege o app de mudanças no Chatwoot.

export interface RawCustomAttributes {
  ai_state?: string;
  ai_summary?: string;
  handoff_motivo?: string;
  handoff_em?: string;
  handoff_status?: string;
  [k: string]: unknown;
}
export interface RawConversation {
  id: number;
  status?: string;
  meta?: { sender?: { name?: string } };
  custom_attributes?: RawCustomAttributes;
}
export interface RawAttachment { file_type?: string }
export interface RawMessage {
  id: number;
  message_type: number; // 0 incoming, 1 outgoing, 2 activity, 3 template
  content?: string | null;
  private?: boolean;
  created_at?: number; // unix seconds
  content_attributes?: { s4s_ai_sent?: boolean };
  attachments?: RawAttachment[];
}

export type Autor = "cliente" | "ia" | "humano";
export type TipoMsg = "texto" | "imagem" | "audio" | "documento" | "local";
export type HandoffStatus = "aberto" | "posse" | "resolvido";

export interface MensagemDTO { id: number; autor: Autor; tipo: TipoMsg; texto: string; em: string | null }
export interface ConversaListItemDTO {
  id: number; contato: string; motivo: string; resumoPreview: string;
  status: HandoffStatus; handoffEm: string | null;
}
export interface ConversaDTO {
  id: number; status: HandoffStatus; aiState: string; aiSummary: string;
  contato: string; mensagens: MensagemDTO[];
}
export interface AcaoDTO { ok: true; status: HandoffStatus; aiState: string }

export function classifyAutor(m: RawMessage): Autor | null {
  if (m.message_type === 0) return "cliente";
  if (m.message_type === 1) return m.content_attributes?.s4s_ai_sent === true ? "ia" : "humano";
  return null; // activity/template não entram na timeline
}

export function classifyTipo(m: RawMessage): TipoMsg {
  if (m.content && m.content.trim()) return "texto";
  const ft = m.attachments?.[0]?.file_type;
  switch (ft) {
    case "image": return "imagem";
    case "audio": return "audio";
    case "location": return "local";
    case "file": return "documento";
    default: return m.attachments?.length ? "documento" : "texto";
  }
}

function emISO(created_at?: number): string | null {
  return typeof created_at === "number" ? new Date(created_at * 1000).toISOString() : null;
}

export function mapMensagem(m: RawMessage): MensagemDTO | null {
  const autor = classifyAutor(m);
  if (!autor) return null;
  const tipo = classifyTipo(m);
  return { id: m.id, autor, tipo, texto: tipo === "texto" ? (m.content ?? "") : "", em: emISO(m.created_at) };
}

export function deriveStatus(conv: RawConversation): HandoffStatus {
  if (conv.status === "resolved") return "resolvido";
  if (conv.custom_attributes?.ai_state === "escalated") return "posse";
  return "aberto";
}

export function isHandoff(conv: RawConversation): boolean {
  const ca = conv.custom_attributes;
  return ca?.ai_state === "escalated" || ca?.handoff_status === "aberto";
}

const PREVIEW_MAX_CHARS = 100;

function preview(s: string | undefined, n = PREVIEW_MAX_CHARS): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function mapListItem(conv: RawConversation): ConversaListItemDTO {
  const ca = conv.custom_attributes ?? {};
  return {
    id: conv.id,
    contato: conv.meta?.sender?.name ?? "Cliente",
    motivo: ca.handoff_motivo ?? "",
    resumoPreview: preview(ca.ai_summary),
    status: deriveStatus(conv),
    handoffEm: ca.handoff_em ?? null,
  };
}

export function mapConversa(conv: RawConversation, msgs: RawMessage[]): ConversaDTO {
  const ca = conv.custom_attributes ?? {};
  return {
    id: conv.id,
    status: deriveStatus(conv),
    aiState: ca.ai_state ?? "active",
    aiSummary: ca.ai_summary ?? "",
    contato: conv.meta?.sender?.name ?? "Cliente",
    mensagens: msgs.map(mapMensagem).filter((x): x is MensagemDTO => x !== null),
  };
}

export function mergeAiState(current: RawCustomAttributes, state: string): RawCustomAttributes {
  return Object.assign({}, current, { ai_state: state });
}
