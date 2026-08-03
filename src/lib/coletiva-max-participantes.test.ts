// Check da regra "máximo de participantes por lote de desconto" (migration
// 0076): o seller define o teto na promoção progressiva, a coletiva herda o
// valor na criação e `coletiva_participar` recusa ENTRADA de participante novo
// acima do teto — quem já está dentro pode aumentar a própria quantidade.
// Validada ao vivo em prod em begin/rollback (limite 2: u1 cria, u2 entra e
// aumenta, u3 bloqueado, total = 2).
//
// ponytail: réplica pura da decisão da RPC. Se a regra mudar na migration,
// mude aqui.

import assert from "node:assert/strict";

function podeEntrar(
  maxParticipantes: number | null,
  totalAtual: number,
  jaParticipa: boolean,
): boolean {
  if (maxParticipantes === null) return true;
  if (jaParticipa) return true;
  return totalAtual < maxParticipantes;
}

// Sem limite: entra sempre.
assert.equal(podeEntrar(null, 99, false), true);

// Com vaga sobrando: entra.
assert.equal(podeEntrar(3, 2, false), true);

// Lotado: participante novo é barrado.
assert.equal(podeEntrar(3, 3, false), false);

// Lotado, mas já é participante: pode aumentar a própria quantidade — ajuda a
// coletiva a fechar sem furar o teto do vendedor.
assert.equal(podeEntrar(3, 3, true), true);

console.log("coletiva-max-participantes: ok");
