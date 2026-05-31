import { describe, it, expect } from "vitest";
import {
  atendimentoUrl,
  funilUrl,
  contatosUrl,
  getEmbedTargets,
} from "@/lib/embed-targets";

describe("embed-targets builders", () => {
  it("atendimentoUrl anexa ?embed=s4s na raiz do Chatwoot", () => {
    expect(atendimentoUrl("https://chat.example.com")).toBe(
      "https://chat.example.com/?embed=s4s",
    );
  });
  it("funilUrl aponta pro CRM do Odoo com embed", () => {
    expect(funilUrl("https://odoo.example.com")).toBe(
      "https://odoo.example.com/odoo/crm?embed=s4s",
    );
  });
  it("contatosUrl aponta pros contatos do Odoo com embed", () => {
    expect(contatosUrl("https://odoo.example.com/")).toBe(
      "https://odoo.example.com/odoo/contacts?embed=s4s",
    );
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
      funil: "https://odoo.example.com/odoo/crm?embed=s4s",
      contatos: "https://odoo.example.com/odoo/contacts?embed=s4s",
    });
  });
});
