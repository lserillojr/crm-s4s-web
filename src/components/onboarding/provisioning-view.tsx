"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrPairing } from "@/components/onboarding/qr-pairing";
import { SsoLaunchers } from "@/components/sso/sso-launchers";
import type { StatusResult } from "@/lib/onboarding/contract";

/**
 * Renderiza a fase pós-submit conforme o status do provisionamento. Plano C
 * para no `success` mínimo (WhatsApp ✓ / IA ✓ / número / link pro painel);
 * os links SSO (Chatwoot/Odoo) entram no Plano E.
 */
export function ProvisioningView({
  status,
  error,
  refreshing,
  onRefresh,
}: {
  status: StatusResult | null;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  if (!status) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Carregando o status da sua conta...
        </CardContent>
      </Card>
    );
  }

  if (status.status === "awaiting_qr_scan") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conecte seu WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Falta só escanear o código. Assim que conectar, sua IA já começa a atender.
          </p>
          <QrPairing qrCodeUrl={status.qr_code_url ?? null} onRefresh={onRefresh} refreshing={refreshing} />
          {error ? <p className="text-xs text-s4s-magenta">{error}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (status.status === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tudo pronto! 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            <li>✅ WhatsApp conectado</li>
            <li>✅ IA ativa e atendendo</li>
          </ul>
          <SsoLaunchers variant="card" />
          <Button asChild className="w-full bg-s4s-blue hover:bg-s4s-blue/90">
            <Link href="/dashboard">Ir pro painel</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status.status === "partial_failure" || status.status === "failed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quase lá</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            {status.user_message ??
              "Tivemos um problema ao ativar sua conta. Nossa equipe já foi avisada e vai resolver."}
          </p>
          <Button type="button" variant="ghost" onClick={onRefresh} disabled={refreshing}>
            Tentar de novo
          </Button>
        </CardContent>
      </Card>
    );
  }

  // in_progress (default)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preparando sua conta...</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Estamos criando seu atendimento com IA. Isso leva menos de um minuto — pode deixar esta tela aberta.
        </p>
        <div
          aria-label="Carregando"
          role="status"
          className="h-1.5 w-full animate-pulse rounded-full bg-s4s-blue/30"
        />
      </CardContent>
    </Card>
  );
}
