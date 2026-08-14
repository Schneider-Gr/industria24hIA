// Check da regra de aceite de termos do parceiro logístico (migration 0063).
// Roda a decisão pura extraída de `salvarCadastroParceiro`: quando exigir o
// aceite e quando carimbar. O resto da action é I/O do Supabase, fora de escopo.
//
// ponytail: replica a decisão em vez de importar a action, que é "use server" e
// arrastaria o cliente Supabase inteiro. Se a regra mudar na action, mude aqui.

import assert from "node:assert/strict";
import { test } from "vitest";

test("aceite-termos", () => {
type Decisao = { exigeAceite: boolean; carimba: boolean };

function decidirAceite(jaAceitou: boolean, marcouCheckbox: boolean): Decisao {
  if (!jaAceitou && !marcouCheckbox) throw new Error("aceite obrigatório");
  return { exigeAceite: !jaAceitou, carimba: !jaAceitou };
}

// Cadastro novo sem marcar o checkbox: barra.
assert.throws(() => decidirAceite(false, false), /aceite obrigat/);

// Cadastro novo com o checkbox marcado: passa e carimba.
assert.deepEqual(decidirAceite(false, true), { exigeAceite: true, carimba: true });

// Edição de quem já aceitou, sem reenviar o checkbox: passa e NÃO recarimba —
// preserva a data e a versão originais do aceite.
assert.deepEqual(decidirAceite(true, false), { exigeAceite: false, carimba: false });

// Edição de quem já aceitou, com o checkbox marcado: ainda não recarimba.
assert.deepEqual(decidirAceite(true, true), { exigeAceite: false, carimba: false });

console.log("ok: aceite de termos do parceiro logístico");
});
