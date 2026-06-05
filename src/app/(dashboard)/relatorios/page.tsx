import { RelatoriosClient } from "@/components/relatorios/relatorios-client";

export default function RelatoriosPage() {
  return (
    <div className="container space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Veja, em poucos números, o que a sua IA fez por você.
        </p>
      </header>
      <RelatoriosClient />
    </div>
  );
}
