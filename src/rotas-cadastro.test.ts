// Seam de rotas (spec #140 + follow-up): todo destino de CTA de entrada tem
// página — regressão do 404 de /seller/cadastro em produção. /cadastro foi
// um redirect 301 pro fluxo de vendedor; agora é página própria de comprador.
//
// Rodar: node --experimental-strip-types src/rotas-cadastro.test.ts

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";

test("rotas-cadastro", () => {
const appDir = join(fileURLToPath(new URL(".", import.meta.url)), "app");
for (const arquivo of ["cadastro/page.tsx", "vender/page.tsx", "seller/cadastro/page.tsx", "login/page.tsx"]) {
  assert.ok(existsSync(join(appDir, arquivo)), `página ausente: src/app/${arquivo}`);
}

console.log("rotas-cadastro.test.ts ok");
});
