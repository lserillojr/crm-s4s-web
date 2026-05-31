import { EmbeddedFrame } from "@/components/shell/embedded-frame";
import { getEmbedTargets } from "@/lib/embed-targets";

export default function AtendimentoPage() {
  return (
    <div className="h-full">
      <EmbeddedFrame src={getEmbedTargets().atendimento} title="Atendimento" />
    </div>
  );
}
