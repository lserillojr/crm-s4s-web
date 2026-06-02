import { EmbeddedFrame } from "@/components/shell/embedded-frame";
import { getEmbedTargets } from "@/lib/embed-targets";

export default function FunilPage() {
  return (
    <div className="h-full">
      <EmbeddedFrame src={getEmbedTargets().funil} title="Funil" />
    </div>
  );
}
