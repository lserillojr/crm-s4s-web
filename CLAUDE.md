# crm-s4s-web — guia operacional

Portal Único do produto S4S (Next.js 14, App Router). Inclui o BFF (rotas `/api`),
o wizard de onboarding, e as telas embedadas por iframe (`(dashboard)`, `/agenda`, etc.).

> Contexto de produto/ambiente (stack, DEV/HML, regras de isolamento) vem da memória do Claude —
> aqui fica só o **como mexer neste repo**.

## Comandos

```bash
# setup (gerenciador = pnpm ≥9; node ≥20)
pnpm install --frozen-lockfile       # instala; nunca npm/yarn

# dev local (precisa .env — cp .env.example .env)
pnpm dev                             # Next.js em http://localhost:3000

# lint / typecheck (EXATAMENTE como o CI — tem que passar limpo)
pnpm lint                            # ESLint (eslint-config-next)
pnpm typecheck                       # tsc --noEmit

# testes unitários (Vitest + jsdom; arquivos em tests/unit/**)
pnpm test                            # vitest run (uma passagem)
pnpm test:watch                      # vitest interativo
pnpm test:ui                         # vitest --ui (browser UI)
# Se node_modules/.bin estiver vazio/corrompido, rode via mjs diretamente:
node node_modules/vitest/vitest.mjs run

# E2E — Playwright (roda no CI; localmente só quando necessário)
pnpm e2e:install                     # instala chromium uma vez
pnpm e2e                             # playwright test (tests/e2e/**)
# E2E_BASE_URL=http://localhost:3000 pnpm e2e  ← aponta pra server já rodando

# build de produção
pnpm build                           # next build (ver Gotchas abaixo)
pnpm start                           # next start -H 0.0.0.0 -p 3000

# DB (Drizzle ORM; conexão via DATABASE_URL no .env)
pnpm db:pull                         # introspection do schema
pnpm db:studio                       # Drizzle Studio na 4983

# formatação
pnpm format                          # prettier --write
pnpm format:check                    # prettier --check (CI não roda, mas útil)
```

- Testes unitários ficam em `tests/unit/**`; E2E em `tests/e2e/**`. Vitest exclui E2E automaticamente.
- Setup global dos testes em `tests/setup.ts` (jest-dom matchers).
- Alias `@` aponta para `src/` (configurado em `vitest.config.ts` e `tsconfig.json`).

## Estrutura

```
src/
  app/
    (auth)/           # rotas de login/logout (Auth.js)
    (dashboard)/      # telas embedadas: agenda, atendimento, funil, contatos, relatorios, settings
    (onboarding)/     # wizard de cadastro
    api/              # BFF: agenda, auth, dashboard, healthz, integrations, kb,
                      #      oauth, onboarding, push, relatorios, tenant, whatsapp, working-hours
    layout.tsx / page.tsx
  auth.ts / auth.config.ts   # Auth.js (NextAuth v5-beta) com OIDC/Keycloak realm s4s
  middleware.ts              # proteção de rotas + redirect auth
  lib/                       # helpers: db.ts, session.ts, embed-targets.ts, sso-targets.ts…
  components/                # componentes React reutilizáveis
tests/
  unit/               # Vitest
  e2e/                # Playwright (auth.setup.ts + specs)
  setup.ts
```

## Deploy

- **DEV** — automático no merge em `main` (`ci.yml` → `deploy.yml`):
  build + push GHCR (`ghcr.io/lserillojr/crm-s4s-web:sha-<commit>`) → `docker service update` no Swarm.
  **NÃO aplica stack/env** — nova env var precisa estar no serviço Swarm antes do deploy.
  Serviço Swarm: `crm-s4s-web_crm-s4s-web`.
- **HML** — `build-hml.yml` (`workflow_dispatch` ou push em `ci/web-hml-build`):
  builda imagem **separada** com URLs HML baked (`hml-chat.*` / `hml-backoffice.*`) e faz push GHCR.
  Deploy no Portainer HML é manual (patchar `IMAGE_TAG` na stack + redeploy com pull).
  → ⚠️ Usar **sempre** digest/sha imutável (`hml-${{ github.sha }}`). Tag `:hml-latest` é mutável
  e não é re-puxada no Portainer → deploy fantasma (container roda imagem antiga sem erro visível).
- `NEXT_PUBLIC_CHATWOOT_URL` e `NEXT_PUBLIC_ODOO_URL` são **build-args** (inlinados no bundle pelo Next)
  — DEV e HML precisam de imagens distintas por causa disso.

## Gotchas deste repo

- **`pnpm build` quebra com `useSearchParams` sem `<Suspense>`.**
  `pnpm dev` e E2E toleram; o build de produção não. Padrão obrigatório: componente interno
  usa o hook → exporta um componente pai com `<Suspense fallback={<Loading />}>` como default export.
- **`Response.redirect` / `NextResponse.redirect` com `req.url` vaza `0.0.0.0:3000`** atrás do proxy
  reverso. Usar sempre: `process.env.AUTH_URL ?? req.nextUrl.origin`.
- **Auth = Auth.js v5-beta (`next-auth@5.0.0-beta.25`) com OIDC/Keycloak.**
  Realm `s4s`; segredos em `.env` (ver `crm-s4s-web/.env`). Não misturar com NextAuth v4.
- **URLs públicas são baked no bundle** (build-args do Docker) — mudar `NEXT_PUBLIC_*` exige
  rebuild da imagem, não basta reiniciar o container.
- **E2E localmente** requer `pnpm e2e:install` (Playwright + Chromium); não incluso no `pnpm install`.
  Em CI, o job instala via `pnpm exec playwright install --with-deps chromium`.
- **path-filter implícito no `deploy.yml`**: o workflow dispara em qualquer push em `main`
  (sem filtro de path). Mas mudanças apenas em docs/config sem toque em `src/` ainda disparam
  build+deploy — não há path-filter neste repo (diferente do crm-s4s-ai).
- **Drizzle ORM** mapeia as tabelas do Postgres compartilhado; schema em `src/lib/schema.ts`.
  Migrations ficam no repo `crm-s4s` (infra/migrations) — este repo só consome o schema.
