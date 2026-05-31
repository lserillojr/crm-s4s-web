import { EmbeddedFrame } from "@/components/shell/embedded-frame";
import { getEmbedTargets } from "@/lib/embed-targets";

export default function ContatosPage() {
  return (
    <div className="h-full">
      <EmbeddedFrame src={getEmbedTargets().contatos} title="Contatos" />
    </div>
  );
}
