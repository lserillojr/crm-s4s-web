import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        Bem-vindo ao Portal S4S — fase 1 scaffold.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mensagens hoje</CardTitle>
            <CardDescription>Sub-Projeto 4 entregará</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-s4s-blue">—</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Leads novos</CardTitle>
            <CardDescription>Sub-Projeto 4 entregará</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-s4s-blue">—</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Próxima reunião</CardTitle>
            <CardDescription>Sub-Projeto 4 entregará</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-s4s-blue">—</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
