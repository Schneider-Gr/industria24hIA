import { afterEach, test, vi } from "vitest";
import assert from "node:assert/strict";
import { decidirParecer, gerarParecerProdutoJev } from "./curadoria-jev";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const TUDO_OK = { nome_claro: 0.9, descricao_do_mesmo_item: 0.9, categoria_coerente: 0.9, venda_restrita: 0.02 };
const GAP = [{ campo: "imagens", mensagem: "Nenhuma imagem cadastrada." }];

test("anúncio coerente e sem gap: aprovado", () => {
  assert.equal(decidirParecer(TUDO_OK, []).decisaoSugerida, "aprovado");
});

// Auditoria #375: texto do seller pode tentar convencer o modelo; gap da regra nunca vira aprovado.
test("gap pendente impede aprovado mesmo com o Jev dizendo que está tudo ok", () => {
  const p = decidirParecer(TUDO_OK, GAP);
  assert.equal(p.decisaoSugerida, "sugestao");
  assert.match(p.texto, /Nenhuma imagem/);
});

test("pergunta de qualidade abaixo do limiar vira ajuste sugerido", () => {
  const p = decidirParecer({ ...TUDO_OK, categoria_coerente: 0.04 }, []);
  assert.equal(p.decisaoSugerida, "sugestao");
  assert.match(p.texto, /categoria/i);
});

test("venda restrita reprova, acima de qualquer outro sinal", () => {
  assert.equal(decidirParecer({ ...TUDO_OK, venda_restrita: 0.95 }, []).decisaoSugerida, "reprovado");
});

test("gerarParecerProdutoJev: pula perguntas sem o que julgar e cai nas regras sem chave ou em erro", async () => {
  vi.stubEnv("TYPESAFE_API_KEY", "k");
  const fetch = vi.fn(async () =>
    Response.json({ answers: { nome_claro: { noul: 0.9 }, venda_restrita: { noul: 0.01 } } }),
  );
  vi.stubGlobal("fetch", fetch);
  const p = await gerarParecerProdutoJev({ nome: "Cimento CP II 50kg", descricao: null, categoria: null }, []);
  assert.equal(p?.decisaoSugerida, "aprovado");
  const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
  assert.deepEqual(Object.keys(body.questions).sort(), ["nome_claro", "venda_restrita"]);

  vi.stubGlobal("fetch", async () => new Response("", { status: 401 }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  assert.equal((await gerarParecerProdutoJev({ nome: "x", descricao: null, categoria: null }, GAP))?.decisaoSugerida, "sugestao");
  assert.equal(await gerarParecerProdutoJev({ nome: "x", descricao: null, categoria: null }, []), null);

  vi.stubEnv("TYPESAFE_API_KEY", "");
  assert.equal(await gerarParecerProdutoJev({ nome: "x", descricao: null, categoria: null }, []), null);
});
