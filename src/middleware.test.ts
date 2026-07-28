// Seam de rotas/HTTP (spec #140): dado um caminho, o middleware redireciona
// para o destino certo; e todo destino de CTA de entrada tem página (regressão
// do 404 de /seller/cadastro em produção).
//
// Rodar: node --experimental-strip-types src/middleware.test.ts
//
// CJS de propósito: o pacote next não expõe "next/server" no exports map ESM,
// então import ESM falha fora do bundler do Next; require resolve.
/* eslint-disable @typescript-eslint/no-require-imports */

const assert = require("node:assert/strict");
const { existsSync } = require("node:fs");
const { join } = require("node:path");
// O pacote next não tem exports map ESM: "next/server" só resolve em CJS.
// Hook mapeia o specifier para o arquivo real ao carregar middleware.ts.
require("node:module").registerHooks({
  resolve(specifier: string, context: unknown, nextResolve: (s: string, c: unknown) => unknown) {
    return nextResolve(specifier === "next/server" ? "next/server.js" : specifier, context);
  },
});
const { NextRequest } = require("next/server");
const { middleware } = require("./middleware.ts");

// /cadastro legado → 301 para /seller/cadastro
const res = middleware(new NextRequest("https://industria24.com.br/cadastro"));
assert.equal(res.status, 301);
assert.equal(res.headers.get("location"), "https://industria24.com.br/seller/cadastro");

// Outros caminhos passam sem redirect
const passa = middleware(new NextRequest("https://industria24.com.br/vender"));
assert.equal(passa.headers.get("location"), null);

// Destinos de CTA de entrada têm página
const appDir = join(__dirname, "app");
for (const arquivo of ["vender/page.tsx", "seller/cadastro/page.tsx", "login/page.tsx"]) {
  assert.ok(existsSync(join(appDir, arquivo)), `página ausente: src/app/${arquivo}`);
}

console.log("middleware.test.ts ok");
