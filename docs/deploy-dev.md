# Deploy DEV — crm-s4s-web (Portal Único SP2 fase 2, Step 7)

Checklist turnkey pro deploy do `crm-s4s-web` no DEV (`dev-app.staff4solutions.com.br`),
ligando o login real via Auth.js v5 + Keycloak OIDC (realm `s4s`, já no ar em `dev-auth`).

> **Decisão 6d (2026-05-24):** o sync de user é **upsert app-side no callback `signIn`**
> do Auth.js — NÃO via webhook/WF16 (desativado). O login cria/atualiza a row em
> `users` (`auth_managed_by='keycloak'`). Isso muda o grant do DB (passo 2).

Pré-req já prontos (sessão 2026-05-24): Keycloak 26.6.2 UP em `dev-auth`, realm `s4s`,
client confidential `web-simples` (secret `MZ5p1LI9N3GS6aHQNmWABVBOUuIkHvNE`),
3 mappers (`tenant_id`/`role`/`phone_number`). Código WS1 + upsert app-side: branch
`feat/sp2-fase2-authjs-oidc` deste repo.

---

## 1. (Lauri) Conferir redirect URIs no client `web-simples`

No admin do Keycloak (`dev-auth`), realm `s4s`, client `web-simples`:
- **Valid redirect URIs:** `https://dev-app.staff4solutions.com.br/api/auth/callback/keycloak`
- **Valid post-logout redirect URIs:** `https://dev-app.staff4solutions.com.br/login`
- **Web origins:** `https://dev-app.staff4solutions.com.br` (ou `+`).

Sem isso o callback do OIDC dá `Invalid redirect_uri`.

## 2. (Lauri) DB user COM escrita em `users` (mudou pela decisão 6d)

O app **não é mais read-only** — o `signIn` faz upsert em `users` (fail-closed: se o
DB não aceitar a escrita, **nenhum login passa**). No Postgres DEV (`crm_s4s`):

```sql
-- criar user dedicado (ou reusar um com escrita)
CREATE USER crm_s4s_web WITH PASSWORD '<hex forte>';
GRANT USAGE ON SCHEMA public TO crm_s4s_web;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO crm_s4s_web;
GRANT INSERT, UPDATE ON users TO crm_s4s_web;
-- o upsert usa now()/defaults; não precisa de GRANT em sequences (id é uuid default).
```

Validar antes de subir a stack:
```sql
-- como crm_s4s_web, tem que rodar sem erro de permissão:
INSERT INTO users (email, auth_managed_by) VALUES ('probe@deploy.dev','keycloak')
  ON CONFLICT (lower(email)) DO UPDATE SET updated_at = now();
DELETE FROM users WHERE email = 'probe@deploy.dev';
```

## 3. (Lauri) DNS

A record `dev-app.staff4solutions.com.br` → IP do VPS DEV (`138.199.227.1`). Aguardar
propagação.

## 4. Build + push da imagem pro GHCR

O `Dockerfile` (multi-stage, `output: standalone`) já existe. Build **em Linux/WSL/CI**
(no Windows+OneDrive o passo de symlink do standalone falha — limitação do FS, não do
código; o build Alpine do Dockerfile completa normal):

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u lserillojr --password-stdin
docker build -t ghcr.io/lserillojr/crm-s4s-web:dev .
docker push ghcr.io/lserillojr/crm-s4s-web:dev
```

(a stack usa `${IMAGE_TAG:-latest}`; setar `IMAGE_TAG=dev` na Environment, ou taggear `latest`.)

## 5. (Lauri) Subir a stack no Portainer DEV

Portainer DEV → Add stack → colar `infraestrutura/dev/portainer/stacks/crm-s4s-web.yml`
(branch `worktree-feature+ambiente-hml` até mergear). Preencher a **Environment**:

| Var | Valor |
|---|---|
| `IMAGE_TAG` | `dev` (ou o tag que você pushou) |
| `DATABASE_URL` | `postgres://crm_s4s_web:<senha>@postgres_postgres:5432/crm_s4s` (rede interna Swarm) ou IP `138.199.227.1:5433` |
| `AUTH_SECRET` | `openssl rand -base64 32` (este é da app/Auth.js — base64 OK, não é env de stack truncável) |
| `AUTH_KEYCLOAK_ID` | `web-simples` |
| `AUTH_KEYCLOAK_SECRET` | `MZ5p1LI9N3GS6aHQNmWABVBOUuIkHvNE` |
| `AUTH_KEYCLOAK_ISSUER` | `https://dev-auth.staff4solutions.com.br/realms/s4s` |

Deploy. Validar health: `https://dev-app.staff4solutions.com.br/api/healthz` → `200`
(ou `503` se DB degradado — aí revisar `DATABASE_URL`).

> NOTA: o `crm-s4s-web.yml` ainda referencia a imagem em `24.0`? Não — usa
> `ghcr.io/lserillojr/crm-s4s-web:${IMAGE_TAG:-latest}`, OK. Conferir só que a rede
> `network_swarm_public` existe (external) e que o Postgres é alcançável pelo nome de
> serviço Swarm escolhido no `DATABASE_URL`.

## 6. Smoke E2E real (após app no ar)

1. **Signup:** `https://dev-app.../signup` → "Criar conta" → registra no Keycloak (realm `s4s`).
2. **Login:** `https://dev-app.../login` → "Entrar com S4S" → autentica → cai em `/dashboard`.
3. **Upsert app-side (substitui a checagem do WF16):** no Postgres DEV, confirmar a row:
   ```sql
   SELECT email, auth_managed_by, tenant_id, phone_number, last_login_at
   FROM users WHERE auth_managed_by = 'keycloak' ORDER BY last_login_at DESC LIMIT 5;
   ```
   Esperado: row com `auth_managed_by='keycloak'`, `tenant_id` NULL (pré-wizard),
   `last_login_at` recente.
4. **Claims na sessão:** decodificar o cookie de sessão (ou logar `await auth()`) e
   conferir `tenant_id`/`role`/`phone_number` — **risco conhecido**: nome de claim
   divergente do mapper vira `undefined` silencioso. Pra testar `tenant_id` populado,
   linkar manualmente um tenant à row e relogar.
5. **Logout:** "Sair" → volta a `/login`; `/dashboard` anônimo redireciona pra `/login`.
6. (opcional) smoke remoto do anônimo→login: `E2E_BASE_URL=https://dev-app... pnpm e2e`.

## 7. Merge (decisão D6)

Após o smoke real passar: merge da branch `feat/sp2-fase2-authjs-oidc` (crm-s4s-web) e
da branch `feature/portal-unico-sp1-keycloak` (crm-s4s) no `main`. Atualizar o Dev Tracker
(auth deixa de bloquear as fases 2 das stories 7.x).

---

### Notas de troubleshooting

- **Login falha pra todo mundo / 500 no callback:** quase sempre é o DB user sem
  INSERT/UPDATE em `users` (passo 2) — o `signIn` é fail-closed.
- **`Invalid redirect_uri`:** redirect URI do client (passo 1) não bate com o host.
- **Claim `undefined`:** nome do mapper ≠ `tenant_id`/`role`/`phone_number` exatos.
- **502 na rota:** serviço não está na rede `network_swarm_public` ou porta != 3000.
