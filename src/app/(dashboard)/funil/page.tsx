import { EmbeddedFrame } from "@/components/shell/embedded-frame";
import { getEmbedTargets } from "@/lib/embed-targets";

export default function FunilPage() {
  // overflow-hidden: nesta rota o scroll vive dentro do iframe (o kanban Odoo tem
  // seu próprio scroll). Impede que o wrapper do portal gere barra de rolagem que
  // oscile a largura do iframe e dispare o loop do kanban. Ver #16.
  return (
    <div className="h-full overflow-hidden">
      <EmbeddedFrame src={getEmbedTargets().funil} title="Funil" />
    </div>
  );
}
