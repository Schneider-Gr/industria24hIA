// Check do filtro de raio (PRD 026). O que importa: distância correta o
// bastante para decidir cobertura, e NUNCA transformar falha do provedor em
// coordenada errada — sem coordenada o produto fica visível, não some.

import assert from "node:assert/strict";
import { test } from "vitest";

const origFetch = globalThis.fetch;
const stub = (resposta: unknown, ok = true) => {
  globalThis.fetch = (async () => ({ ok, json: async () => resposta })) as unknown as typeof fetch;
};

const MANAUS = { lat: -3.119, lon: -60.0217 };
const RIO_BRANCO = { lat: -9.9754, lon: -67.8249 };
const PAULISTA = { lat: -23.5614, lon: -46.6559 };
const SE = { lat: -23.5503, lon: -46.6339 };

async function main() {
  process.env.GOOGLE_MAPS_API_KEY = "chave-de-teste";
  const geo = await import("./geo.ts?raio" as unknown as "./geo");

  // Distância: ponto a ele mesmo é zero, e a escala bate com a realidade.
  assert.equal(geo.distanciaKm(MANAUS, MANAUS), 0);
  const longa = geo.distanciaKm(MANAUS, RIO_BRANCO);
  assert.ok(longa > 1050 && longa < 1200, `Manaus-Rio Branco fora do esperado: ${longa}`);

  // Intramunicipal: é este caso que o centróide de município não resolvia.
  const curta = geo.distanciaKm(PAULISTA, SE);
  assert.ok(curta > 2 && curta < 3.5, `Paulista-Sé fora do esperado: ${curta}`);

  // Simétrica.
  assert.equal(
    geo.distanciaKm(PAULISTA, SE).toFixed(6),
    geo.distanciaKm(SE, PAULISTA).toFixed(6),
  );

  // Geocoding feliz.
  stub({ status: "OK", results: [{ geometry: { location: { lat: -3.1, lng: -60.02 } } }] });
  const ok = await geo.geocodificarCep("69000-000");
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.ok && ok.valor, { lat: -3.1, lon: -60.02 });

  // CEP malformado nem chega a gastar chamada paga.
  let chamou = false;
  globalThis.fetch = (async () => {
    chamou = true;
    return { ok: true, json: async () => ({}) };
  }) as unknown as typeof fetch;
  assert.deepEqual(await geo.geocodificarCep("123"), { ok: false, erro: "sem_resultado" });
  assert.equal(chamou, false);

  // CEP inexistente: erro de negócio, não de provedor.
  stub({ status: "ZERO_RESULTS", results: [] });
  assert.deepEqual(await geo.geocodificarCep("99999999"), { ok: false, erro: "sem_resultado" });

  // Provedor fora do ar: devolve erro, NÃO lança e NÃO inventa coordenada.
  stub({}, false);
  assert.deepEqual(await geo.geocodificarCep("69000000"), {
    ok: false,
    erro: "provedor_indisponivel",
  });

  // Reverse geocoding do banner "usar minha localização".
  stub({
    status: "OK",
    results: [
      {
        address_components: [
          { long_name: "69000-000", types: ["postal_code"] },
          { long_name: "Manaus", types: ["administrative_area_level_2"] },
          { short_name: "AM", types: ["administrative_area_level_1"] },
        ],
      },
    ],
  });
  const rev = await geo.enderecoDaCoordenada(MANAUS);
  assert.deepEqual(rev.ok && rev.valor, { cep: "69000000", cidade: "Manaus", uf: "AM" });

  // Coordenada no meio do mato: sem CEP, sem chute.
  stub({ status: "OK", results: [{ address_components: [] }] });
  assert.deepEqual(await geo.enderecoDaCoordenada(MANAUS), { ok: false, erro: "sem_resultado" });

  // Sem chave configurada: nada de rede.
  delete process.env.GOOGLE_MAPS_API_KEY;
  const semChave = await import("./geo.ts?raiosemchave" as unknown as "./geo");
  assert.deepEqual(await semChave.geocodificarCep("69000000"), {
    ok: false,
    erro: "nao_configurado",
  });
  assert.deepEqual(await semChave.enderecoDaCoordenada(MANAUS), {
    ok: false,
    erro: "nao_configurado",
  });
}

test("geo: raio, geocoding e reverse geocoding", async () => {
  try {
    await main();
  } finally {
    globalThis.fetch = origFetch;
  }
});
