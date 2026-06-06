import { AgendaClient } from "@/components/agenda/agenda-client";

export default function AgendaPage() {
  return (
    <div className="container space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-bold">Agenda</h1>
        <p className="text-muted-foreground">
          Seus próximos compromissos, marcados pela sua IA ou por você.
        </p>
      </header>
      <AgendaClient />
    </div>
  );
}
