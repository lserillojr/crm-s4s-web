"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "./status-pill";
import { WhatsAppQrModal } from "./whatsapp-qr-modal";
import type { IntegrationHealth } from "@/lib/integrations/get-integration-health";

type WaData = IntegrationHealth["whatsapp"];

const PENDING_STATES = new Set(["connecting", "awaiting_qr_scan", "pending", "qr_pending"]);

function relativeTime(date: Date | string | null): string {
  if (date === null) return "ainda sem msgs";
  const d = typeof date === "string" ? new Date(date) : date;
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

export function WhatsAppCard({ data }: { data: WaData }) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const isPending = data.waStatus !== null && PENDING_STATES.has(data.waStatus);

  return (
    <>
      <Card data-testid="whatsapp-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle aria-hidden="true" className="h-4 w-4 text-green-600" />
            WhatsApp
          </CardTitle>
          <StatusPill level={data.level} />
        </CardHeader>
        <CardContent className="space-y-3">
          {data.level === "unconnected" && (
            <>
              <p className="text-sm">Não conectado</p>
              <p className="text-xs text-muted-foreground">Finalize o cadastro do número.</p>
              <Link
                href="/wizard/whatsapp"
                className="inline-flex h-9 items-center justify-center rounded-md bg-s4s-blue px-4 text-sm font-medium text-white"
              >
                Conectar WhatsApp
              </Link>
            </>
          )}

          {data.level === "error" && (
            <>
              <p className="text-sm font-medium text-red-700">Desconectado</p>
              <p className="text-xs text-muted-foreground">
                Seu WhatsApp caiu. Reparear emite um novo QR code.
              </p>
              <Button variant="destructive" onClick={() => setModalOpen(true)}>
                Reparear
              </Button>
            </>
          )}

          {data.level === "warn" && (
            <>
              <p className="text-sm">
                {isPending ? "Aguardando pareamento" : "Sem atividade recente"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPending
                  ? "Escaneie o QR pra finalizar."
                  : `Conectado mas sem msg ${relativeTime(data.lastInboundAt)}. Confirme com um chip de teste.`}
              </p>
              <Button variant="outline" onClick={() => setModalOpen(true)}>
                {isPending ? "Continuar pareamento" : "Reparear"}
              </Button>
            </>
          )}

          {data.level === "ok" && (
            <>
              <p className="text-sm">Conectado</p>
              <p className="text-xs text-muted-foreground">
                Última msg recebida {relativeTime(data.lastInboundAt)}
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-s4s-blue hover:underline"
              >
                Reparear
              </button>
            </>
          )}
        </CardContent>
      </Card>

      <WhatsAppQrModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnected={() => router.refresh()}
      />
    </>
  );
}
