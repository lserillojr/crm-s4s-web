import { EmbeddedFrame } from "@/components/shell/embedded-frame";
import {
  atendimentoConversationUrl,
  getEmbedTargets,
} from "@/lib/embed-targets";

function parseId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default function AtendimentoPage({
  searchParams,
}: {
  searchParams: { conversa?: string; conta?: string };
}) {
  const base = process.env.NEXT_PUBLIC_CHATWOOT_URL;
  const conversa = parseId(searchParams.conversa);
  const conta = parseId(searchParams.conta);

  const src =
    base && conversa && conta
      ? atendimentoConversationUrl(base, conta, conversa)
      : getEmbedTargets().atendimento;

  return (
    <div className="h-full">
      <EmbeddedFrame src={src} title="Atendimento" />
    </div>
  );
}
