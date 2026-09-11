import assert from "node:assert/strict";
import { test } from "vitest";
import { CAMPOS_CRITICOS, DICAS, buscarDica } from "./dicas";

// Guarda da spec `seller-ajuda-contextual/dicas-campo`: campo crítico sem dica
// e rascunho sem marcação são os dois jeitos de a ajuda sair errada em
// produção — ambos quebram o CI aqui em vez de virar dúvida do seller.

test("todo campo crítico tem dica com peso fixo", () => {
  const faltando: string[] = [];
  const pesoErrado: string[] = [];

  for (const [tela, campos] of Object.entries(CAMPOS_CRITICOS)) {
    for (const campo of campos) {
      const dica = buscarDica(tela, campo);
      if (!dica) faltando.push(`${tela}.${campo}`);
      else if (dica.peso !== "fixa") pesoErrado.push(`${tela}.${campo}`);
    }
  }

  assert.deepEqual(faltando, [], `campos críticos sem dica: ${faltando.join(", ")}`);
  assert.deepEqual(
    pesoErrado,
    [],
    `campos críticos que deveriam ter dica fixa: ${pesoErrado.join(", ")}`,
  );
});

test("dica de rascunho carrega marcação de revisão pendente", () => {
  const semMarcacao = Object.entries(DICAS).flatMap(([tela, campos]) =>
    Object.entries(campos)
      .filter(([, dica]) => dica.origem === "rascunho" && dica.revisada !== false)
      .map(([campo]) => `${tela}.${campo}`),
  );

  assert.deepEqual(
    semMarcacao,
    [],
    `rascunhos sem marcação de revisão: ${semMarcacao.join(", ")}`,
  );
});

test("dica vinda do manual aponta o tópico da Central de Dúvidas", () => {
  const semTopico = Object.entries(DICAS).flatMap(([tela, campos]) =>
    Object.entries(campos)
      .filter(([, dica]) => dica.origem === "manual" && !dica.topico)
      .map(([campo]) => `${tela}.${campo}`),
  );

  assert.deepEqual(semTopico, [], `dicas do manual sem tópico: ${semTopico.join(", ")}`);
});

test("nenhuma dica é texto vazio ou só espaço", () => {
  const vazias = Object.entries(DICAS).flatMap(([tela, campos]) =>
    Object.entries(campos)
      .filter(([, dica]) => dica.texto.trim().length === 0)
      .map(([campo]) => `${tela}.${campo}`),
  );

  assert.deepEqual(vazias, [], `dicas vazias: ${vazias.join(", ")}`);
});

test("buscarDica devolve undefined para tela ou campo desconhecido", () => {
  assert.equal(buscarDica("tela-que-nao-existe", "nome"), undefined);
  assert.equal(buscarDica("produto", "campo-que-nao-existe"), undefined);
});
