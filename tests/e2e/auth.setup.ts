import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const authFile = "tests/e2e/.auth/user.json";

setup("autentica via provider mock", async ({ request }) => {
  // Garante que o diretório .auth existe
  const dir = path.dirname(authFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Auth.js v5: pega o CSRF token primeiro
  const csrfResp = await request.get("/api/auth/csrf");
  expect(csrfResp.ok()).toBeTruthy();
  const { csrfToken } = await csrfResp.json();
  expect(csrfToken).toBeTruthy();

  // Posta no callback do provider credentials
  const resp = await request.post("/api/auth/callback/credentials", {
    maxRedirects: 0,
    form: {
      csrfToken,
      email: "maria@teste.dev",
      callbackUrl: "/dashboard",
      redirect: "false",
    },
  });

  // Auth.js v5 pode retornar 200, 302 ou mesmo um redirect; o importante
  // é que o cookie authjs.session-token (ou next-auth.session-token) seja setado.
  // Aceitamos qualquer resposta não-5xx como válida aqui.
  expect(resp.status()).toBeLessThan(500);

  // Salva o storageState (cookies da sessão)
  await request.storageState({ path: authFile });

  // Gate real do login: o storageState precisa ter o cookie de sessão do
  // Auth.js (`*session-token`) com valor NÃO-vazio. Só a presença do nome não
  // basta — um cookie vazio significaria login não-autenticado.
  const state = JSON.parse(fs.readFileSync(authFile, "utf-8")) as {
    cookies: Array<{ name: string; value: string }>;
  };
  const sessionCookie = state.cookies.find(
    (c) => c.name.includes("session-token") && c.value.length > 0
  );
  expect(
    sessionCookie,
    `Cookie de sessão (*session-token) ausente ou vazio no storageState. Cookies: ${state.cookies
      .map((c) => c.name)
      .join(", ")}`
  ).toBeTruthy();
});
