"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  followupConfigDefaults,
  followupConfigSchema,
} from "@/lib/followup/schema";

const ENDPOINT = "/api/followup-config";

export function FollowupInviteCard() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch(ENDPOINT, { method: "GET" });
        const body = (await res.json()) as { config?: unknown };
        const parsed = followupConfigSchema.safeParse(body.config);
        if (active && parsed.success) setShow(!parsed.data.enabled);
      } catch {
        /* silencioso: sem convite se não der pra ler */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const ligar = async () => {
    setBusy(true);
    try {
      const res = await fetch(ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...followupConfigDefaults,
          enabled: true,
          intensity: "padrao",
        }),
      });
      if (res.ok) setShow(false);
    } finally {
      setBusy(false);
    }
  };

  if (!show) return null;

  return (
    <Card
      data-testid="followup-invite"
      className="border-s4s-blue/40 bg-blue-50/40"
    >
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          <strong>
            Quer que eu reative clientes que pararam de responder?
          </strong>{" "}
          Eu mando uma mensagem amigável no seu nome — dentro do seu horário de
          atendimento.
        </p>
        <Button
          type="button"
          onClick={() => void ligar()}
          disabled={busy}
          className="bg-s4s-blue hover:bg-s4s-blue/90 shrink-0"
        >
          {busy ? "Ligando..." : "Ativar acompanhamento"}
        </Button>
      </CardContent>
    </Card>
  );
}
