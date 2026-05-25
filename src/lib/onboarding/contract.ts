import type { WizardData } from "@/lib/wizard/schemas";

/** Estados canônicos da máquina de provisionamento (tenant_creation_audit.status). */
export type ProvisionStatus =
  | "in_progress"
  | "awaiting_qr_scan"
  | "success"
  | "partial_failure"
  | "failed";

/** Body do POST /onboarding/provision (contrato Story 9.6). */
export interface ProvisionRequest {
  idempotency_key: string;
  user: { email: string; name: string; password_hash: null };
  tenant: {
    slug: string;
    vertical: string;
    company_name: string;
    wa_provider: string;
    wa_phone_id: null;
    wa_phone_display: string;
    instagram_account_id: null;
    instagram_access_token: null;
    google_calendar_refresh_token: null;
    ai_cost_tier: "economy";
    ai_kb_overrides: { business_name: string; about: string } | null;
    lgpd_disclaimer_text: null;
  };
  wizard_state: { step_completed: string; metadata: Record<string, unknown> };
  callback_preferences: { magic_link_redirect_url: string; email_locale: "pt-BR" };
}

/** Resposta normalizada do provision (202 accept ou 200 replay). */
export interface ProvisionResult {
  audit_id: string;
  status: ProvisionStatus;
  poll_url?: string;
  estimated_seconds?: number;
  idempotency_replay?: boolean;
  magic_link?: string | null;
  tenant_id?: string | null;
}

/** Resposta do GET /onboarding/status. */
export interface StatusResult {
  audit_id: string;
  status: ProvisionStatus;
  completed_steps: string[];
  current_step?: string | null;
  attempt_number?: number;
  elapsed_seconds?: number;
  magic_link?: string | null;
  tenant_id?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  user_message?: string | null;
  qr_code_url?: string | null;
}

/**
 * Normaliza um texto livre num slug `^[a-z0-9-]+$`. Remove acentos (NFD),
 * troca tudo que não é alfanumérico por `-`, colapsa e apara. Fallback
 * determinístico `mei-<6hex>` quando o resultado fica vazio (ex: só símbolos),
 * pra nunca enviar slug inválido que o WF11 NODE 3 rejeitaria (400).
 */
export function slugify(input: string): string {
  const slug = (input ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug) return slug;
  const rand = Math.random().toString(16).slice(2, 8).padEnd(6, "0");
  return `mei-${rand}`;
}

interface BuildPayloadInput {
  wizard: WizardData;
  user: { email: string; name: string | null };
  idempotencyKey: string;
  magicLinkRedirectUrl: string;
}

/** Mapeamento puro WizardData → ProvisionRequest. Sem I/O. */
export function buildProvisionPayload(input: BuildPayloadInput): ProvisionRequest {
  const { wizard, user, idempotencyKey, magicLinkRedirectUrl } = input;
  const businessName = wizard.kb.businessName ?? "";
  const about = wizard.kb.about ?? "";
  const phoneDigits = (wizard.whatsapp.phoneNumber ?? "").replace(/\D/g, "");

  return {
    idempotency_key: idempotencyKey,
    user: { email: user.email, name: user.name ?? "", password_hash: null },
    tenant: {
      slug: slugify(businessName),
      vertical: wizard.kb.vertical ?? "outro",
      company_name: businessName,
      wa_provider: wizard.whatsapp.provider ?? "evolution",
      wa_phone_id: null,
      wa_phone_display: phoneDigits,
      instagram_account_id: null,
      instagram_access_token: null,
      google_calendar_refresh_token: null,
      ai_cost_tier: "economy",
      ai_kb_overrides: businessName || about ? { business_name: businessName, about } : null,
      lgpd_disclaimer_text: null,
    },
    wizard_state: {
      step_completed: "5_review",
      metadata: {
        instagram_connect: wizard.instagram.connect ?? false,
        instagram_handle: wizard.instagram.instagramHandle ?? null,
        calendar_connect: wizard.calendar.connect ?? false,
        calendar_timezone: wizard.calendar.timezone ?? "America/Sao_Paulo",
        has_existing_number: wizard.whatsapp.hasExistingNumber ?? true,
      },
    },
    callback_preferences: {
      magic_link_redirect_url: magicLinkRedirectUrl,
      email_locale: "pt-BR",
    },
  };
}
