import { describe, it, expect } from "vitest";
import {
  atendimentoUrl,
  atendimentoConversationUrl,
  funilUrl,
  contatosUrl,
  getEmbedTargets,
  relatoriosDetalhadoUrl,
  buildDetalhadoSrc,
} from "@/lib/embed-targets";

describe("embed-targets builders", () => {
  it("atendimentoUrl anexa ?embed=s4s na raiz do Chatwoot", () => {
    expect(atendimentoUrl("https://chat.example.com")).toBe(
      "https://chat.example.com/?embed=s4s",
    );
  });
  it("funilUrl aponta pro pipeline do CRM (action xmlid, Odoo 19) com embed", () => {
    expect(funilUrl("https://odoo.example.com")).toBe(
      "https://odoo.example.com/odoo/action-crm.crm_lead_action_pipeline?embed=s4s",
    );
  });
  it("contatosUrl aponta pros contatos do Odoo com embed", () => {
    expect(contatosUrl("https://odoo.example.com/")).toBe(
      "https://odoo.example.com/odoo/contacts?embed=s4s",
    );
  });
  it("atendimentoConversationUrl monta o deep-link do Chatwoot com embed", () => {
    expect(
      atendimentoConversationUrl("https://chat.example.com", 36, 999),
    ).toBe(
      "https://chat.example.com/app/accounts/36/conversations/999?embed=s4s",
    );
  });
  it("atendimentoConversationUrl tolera barra final na base", () => {
    expect(
      atendimentoConversationUrl("https://chat.example.com/", 36, 999),
    ).toBe(
      "https://chat.example.com/app/accounts/36/conversations/999?embed=s4s",
    );
  });
});

describe("relatoriosDetalhadoUrl", () => {
  it("monta a URL de Reports do Chatwoot com embed", () => {
    expect(relatoriosDetalhadoUrl("https://chat.example.com", 2)).toBe(
      "https://chat.example.com/app/accounts/2/reports/overview?embed=s4s",
    );
  });
  it("remove barra final da base", () => {
    expect(relatoriosDetalhadoUrl("https://chat.example.com/", 7)).toBe(
      "https://chat.example.com/app/accounts/7/reports/overview?embed=s4s",
    );
  });
});

describe("buildDetalhadoSrc", () => {
  const base = "https://chat.example.com";
  it("retorna a URL quando base válida + conta presente", () => {
    expect(buildDetalhadoSrc(base, 2)).toBe(
      "https://chat.example.com/app/accounts/2/reports/overview?embed=s4s",
    );
  });
  it("null quando base ausente", () => {
    expect(buildDetalhadoSrc(null, 2)).toBeNull();
  });
  it("null quando conta ausente", () => {
    expect(buildDetalhadoSrc(base, null)).toBeNull();
  });
  it("null quando base não é URL http(s)", () => {
    expect(buildDetalhadoSrc("nao-e-url", 2)).toBeNull();
  });
});

describe("getEmbedTargets", () => {
  it("retorna null por área quando a env base está ausente/ inválida", () => {
    delete process.env.NEXT_PUBLIC_CHATWOOT_URL;
    delete process.env.NEXT_PUBLIC_ODOO_URL;
    expect(getEmbedTargets()).toEqual({
      atendimento: null,
      funil: null,
      contatos: null,
    });
  });
  it("monta as 3 URLs quando as envs são válidas", () => {
    process.env.NEXT_PUBLIC_CHATWOOT_URL = "https://chat.example.com";
    process.env.NEXT_PUBLIC_ODOO_URL = "https://odoo.example.com";
    expect(getEmbedTargets()).toEqual({
      atendimento: "https://chat.example.com/?embed=s4s",
      funil: "https://odoo.example.com/odoo/action-crm.crm_lead_action_pipeline?embed=s4s",
      contatos: "https://odoo.example.com/odoo/contacts?embed=s4s",
    });
  });
});
