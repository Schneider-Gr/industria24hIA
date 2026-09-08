// Check do módulo de trajeto: o que importa é NUNCA devolver número quando a
// integração está pendente ou o provedor falhou, e nunca lançar (o webhook do
// Asaas roda no caminho do dinheiro). Roda com fetch mockado, sem rede.
//
// ponytail: mock de fetch no lugar de adapter injetável — um seam a menos.

import assert from "node:assert/strict";
import { test } from "vitest";

const origFetch = globalThis.fetch;
const stub = (resposta: unknown, ok = true) => {
  globalThis.fetch = (async () => ({ ok, json: async () => resposta })) as unknown as typeof fetch;
};

async function main() {
  // Sem chave: nada de número, e link continua funcionando.
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_MAPS_API;
  const semChave = await import("./geo.ts?semchave" as unknown as "./geo");
  assert.equal(semChave.isGeoConfigurado, false);
  assert.deepEqual(await semChave.calcularTrajeto("69000-000", "69100-000"), {
    ok: false,
    erro: "nao_configurado",
  });
  assert.match(semChave.linkTrajeto("A", "B"), /^https:\/\/www\.google\.com\/maps\/dir/);

  // Nome alternativo da variavel (o que existe no projeto Vercel).
  process.env.GOOGLE_MAPS_API = "chave-alternativa";
  const alt = await import("./geo.ts?alt" as unknown as "./geo");
  assert.equal(alt.isGeoConfigurado, true);
  delete process.env.GOOGLE_MAPS_API;

  // O bug de 08/09: GOOGLE_MAPS_API_KEY definida e VAZIA mascarava a
  // GOOGLE_MAPS_API boa, e a localizacao automatica caiu em producao com a
  // integracao aparentando estar configurada. Vence a primeira chave com
  // conteudo, nao a primeira que existe.
  process.env.GOOGLE_MAPS_API_KEY = "";
  process.env.GOOGLE_MAPS_API = "chave-alternativa";
  const vazia = await import("./geo.ts?vazia" as unknown as "./geo");
  assert.equal(vazia.isGeoConfigurado, true);
  delete process.env.GOOGLE_MAPS_API;

  // Ambas vazias continua sendo "nao configurado", nao um fetch com key="".
  process.env.GOOGLE_MAPS_API_KEY = "   ";
  const brancos = await import("./geo.ts?brancos" as unknown as "./geo");
  assert.equal(brancos.isGeoConfigurado, false);

  // Com chave.
  process.env.GOOGLE_MAPS_API_KEY = "chave-de-teste";
  const geo = await import("./geo.ts?comchave" as unknown as "./geo");
  assert.equal(geo.isGeoConfigurado, true);

  stub({ routes: [{ distanceMeters: 12345, duration: "1800s" }] });
  const ok = await geo.calcularTrajeto("Rua A, Manaus", "Rua B, Manaus");
  assert.equal(ok.ok, true);
  assert.equal(ok.ok && ok.valor.distancia_m, 12345);
  assert.equal(ok.ok && ok.valor.duracao_s, 1800); // "1800s" → 1800

  stub({ routes: [] });
  assert.deepEqual(await geo.calcularTrajeto("A", "B"), { ok: false, erro: "sem_rota" });

  stub({}, false); // HTTP 5xx: devolve erro, NÃO lança
  assert.deepEqual(await geo.calcularTrajeto("A", "B"), { ok: false, erro: "provedor_indisponivel" });

  globalThis.fetch = (async () => {
    throw new Error("rede caiu");
  }) as typeof fetch;
  assert.deepEqual(await geo.calcularTrajeto("A", "B"), { ok: false, erro: "provedor_indisponivel" });

  globalThis.fetch = origFetch;
  console.log("geo: ok");
}

test("geo", main);
