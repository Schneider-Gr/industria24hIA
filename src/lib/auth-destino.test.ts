import assert from "node:assert/strict";
import { test } from "vitest";
import { destinoPorPapel } from "./auth-destino";

const nenhum = {
  admin: false,
  temLoja: false,
  afiliacaoAtiva: false,
  afiliacaoEmAnalise: false,
  parceiroAtivo: false,
};

test("destinoPorPapel: precedência de painel por papel", () => {
  // Sem papel nenhum: comprador vai pra home.
  assert.equal(destinoPorPapel(nenhum), "/");

  // Admin ganha de todo o resto.
  assert.equal(
    destinoPorPapel({
      admin: true,
      temLoja: true,
      afiliacaoAtiva: true,
      afiliacaoEmAnalise: true,
      parceiroAtivo: true,
    }),
    "/admin",
  );

  // Loja > afiliação > parceiro.
  assert.equal(destinoPorPapel({ ...nenhum, temLoja: true }), "/seller");
  assert.equal(destinoPorPapel({ ...nenhum, temLoja: true, afiliacaoAtiva: true }), "/seller");
  assert.equal(destinoPorPapel({ ...nenhum, afiliacaoAtiva: true }), "/afiliado");
  assert.equal(
    destinoPorPapel({ ...nenhum, afiliacaoAtiva: true, parceiroAtivo: true }),
    "/afiliado",
  );
  assert.equal(destinoPorPapel({ ...nenhum, parceiroAtivo: true }), "/parceiro");
});

test("destinoPorPapel: afiliação sem aprovação não manda pro painel", () => {
  // Pendente/Rejeitada: o layout de /afiliado exige Aprovada/Suspensa, então
  // mandar pra lá rebate no login em loop. Vai pro onboarding, que mostra o
  // status da solicitação.
  assert.equal(destinoPorPapel({ ...nenhum, afiliacaoEmAnalise: true }), "/afiliado/solicitar");

  // Quem já tem painel de verdade não é desviado pro onboarding.
  assert.equal(
    destinoPorPapel({ ...nenhum, afiliacaoEmAnalise: true, temLoja: true }),
    "/seller",
  );
  assert.equal(
    destinoPorPapel({ ...nenhum, afiliacaoEmAnalise: true, parceiroAtivo: true }),
    "/parceiro",
  );
  // Aprovada implica em análise já resolvida: o painel vence.
  assert.equal(
    destinoPorPapel({ ...nenhum, afiliacaoEmAnalise: true, afiliacaoAtiva: true }),
    "/afiliado",
  );
});
