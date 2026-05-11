# crm-s4s-web

S4S Recepcionista IA — Web Simples (signup/wizard/dashboard). Parte do Portal Único S4S.

**Status**: Sub-Projeto 2 fase 1 (scaffold). Fase 2 (Auth.js OIDC) destrava após Sub-Projeto 1 (Keycloak) entregar.

## Stack

- **Framework**: Next.js 14 App Router + TypeScript 5 strict
- **Style**: Tailwind 3 + shadcn/ui (Radix base) + paleta S4S azul/magenta
- **State**: Tanstack Query v5
- **Forms**: react-hook-form + zod
- **DB**: Drizzle ORM (read-only sobre Postgres compartilhado Hetzner)
- **PWA**: next-pwa (preparado pra Capacitor wrap Sub-Projeto 6)
- **Tests**: Vitest (unit) + Playwright (E2E)
- **Auth**: Auth.js v5 OIDC apontando Keycloak (fase 2)

## Setup local

```bash
# Pré-req: Node 20 + pnpm 9
pnpm install
cp .env.example .env.local
# editar .env.local: pelo menos DATABASE_URL com user dedicado read-only
pnpm dev
# abrir http://localhost:3000
```

## Scripts

| Script | Descrição |
|---|---|
| `pnpm dev` | Dev server (HMR, PWA desabilitado) |
| `pnpm build` | Production build (standalone, Docker-ready) |
| `pnpm start` | Production server (após build) |
| `pnpm test` | Unit tests Vitest |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm e2e` | Playwright E2E |
| `pnpm e2e:install` | Instala browsers Playwright + deps |
| `pnpm lint` | ESLint (config next/core-web-vitals) |
| `pnpm typecheck` | tsc --noEmit (strict + noUncheckedIndexedAccess) |
| `pnpm db:pull` | Drizzle introspect schema do Postgres |
| `pnpm db:studio` | Drizzle Studio UI |
| `pnpm format` | Prettier write |

## Estrutura

```
crm-s4s-web/
├── src/
│   ├── app/
│   │   ├── (auth)/login, signup    # placeholder fase 1
│   │   ├── (dashboard)/dashboard   # placeholder fase 1
│   │   ├── api/healthz             # 200/503 contract
│   │   ├── layout.tsx              # Open Sans + Ruda fonts
│   │   ├── page.tsx                # landing hero
│   │   └── globals.css             # Tailwind + shadcn HSL vars
│   ├── components/ui/              # shadcn: button/card/input/label/form
│   └── lib/
│       ├── db.ts                   # postgres-js + Drizzle singleton
│       ├── env.ts                  # zod validation
│       ├── schema.ts               # tenants/users/tenant_creation_audit
│       └── utils.ts                # cn() helper
├── tests/
│   ├── unit/                       # vitest
│   └── e2e/                        # playwright
├── public/icons/                   # PWA icons (placeholder #4076BB sólido)
├── scripts/generate-placeholder-icons.mjs
├── Dockerfile                      # multi-stage Node 20-alpine standalone
├── docker-compose.yml              # Portainer stack
├── drizzle.config.ts
├── playwright.config.ts
├── vitest.config.ts
└── .github/workflows/
    ├── ci.yml                      # PR/push: lint+test+E2E+docker build
    └── deploy.yml                  # main: build GHCR + Portainer webhook
```

## Deploy

CI/CD: push em `main` → GitHub Actions builda Docker → push `ghcr.io/lserillojr/crm-s4s-web:<sha>` → Portainer webhook puxa imagem nova.

- **URL DEV**: https://dev-app.staff4solutions.com.br (provisionar — handoff fase 1)
- **URL PROD**: https://app.staff4solutions.com.br (Soft Launch S11)

### Pré-requisitos operacionais (handoff Lauri)

1. **Postgres user dedicado**:
   ```sql
   CREATE USER crm_s4s_web_ro WITH PASSWORD '<gerar>';
   GRANT CONNECT ON DATABASE crm_s4s TO crm_s4s_web_ro;
   GRANT USAGE ON SCHEMA public TO crm_s4s_web_ro;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO crm_s4s_web_ro;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO crm_s4s_web_ro;
   ```
2. **GitHub Secret** `PORTAINER_STACK_WEBHOOK` (Portainer → Stacks → crm-s4s-web → Webhooks → Generate)
3. **Portainer stack** `crm-s4s-web` criada com `docker-compose.yml` + env vars
4. **DNS** A record `dev-app.staff4solutions.com.br` → IP Hetzner
5. **Reverse proxy** rota `dev-app` → `crm-s4s-web:3000`

## Arquitetura

Documentação completa: [Portal Único Strategic Overview](https://github.com/lserillojr/estrategia-produto/blob/main/docs/superpowers/specs/2026-05-10-portal-unico-strategic-overview.md) (repo privado).

Resumo:
- **Auth**: Keycloak SP1 (`dev-auth.staff4solutions.com.br`)
- **API backend**: n8n workflows SP9.6 (provision-tenant async)
- **DB**: Postgres compartilhado com Chatwoot/Odoo/Painel/IA
- **Reverse proxy**: Hetzner Caddy/Traefik

## Limites fase 1

- Páginas `/login`, `/signup`, `/dashboard` são **placeholders coming soon**. Lógica real entra fase 2+.
- DB read-only — qualquer escrita futura passará por n8n WFs (idempotent + auditado em `tenant_creation_audit`).
- Ícones PWA são **placeholder cor sólida #4076BB** (gerados via script Node). Substituir quando designer entregar logo real.
- Build Docker standalone **não testado em Windows local** (limitação OneDrive + symlink). Valida em CI Linux.
