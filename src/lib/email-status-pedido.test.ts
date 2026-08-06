// Cobre qual assunto/corpo de e-mail é escolhido por status_pedido
// (assuntoEmailStatusPedido, lib/email.ts). Lógica pura, sem IO — não mocka
// Supabase/Resend, só verifica o mapeamento status -> conteúdo usado pelo
// disparo em notificarMudancaStatusPedido (webhook Asaas, futuras ações
// admin/seller de "Em Separação"/"Enviado"/"Cancelado").
import assert from "node:assert/strict";
import { assuntoEmailStatusPedido } from "./email";

const IDVENDA = "IND-0001";

// Cada status coberto pelo disparo tem assunto e corpo mencionando o id_venda.
for (const status of ["Pagamento Realizado", "Em Separação", "Enviado", "Cancelado"]) {
  const resultado = assuntoEmailStatusPedido(status, IDVENDA);
  assert.ok(resultado, `esperava conteúdo de e-mail para status "${status}"`);
  assert.ok(resultado!.subject.length > 0);
  assert.ok(resultado!.text.includes(IDVENDA));
}

// Status sem e-mail configurado (ex: "Aguardando Pagamento") não deve
// disparar nada — a função central retorna null e o caller não envia.
assert.equal(assuntoEmailStatusPedido("Aguardando Pagamento", IDVENDA), null);
assert.equal(assuntoEmailStatusPedido("status_inexistente", IDVENDA), null);

// Assuntos diferenciam o status (evita reaproveitar o mesmo texto por engano).
const assuntos = new Set(
  ["Pagamento Realizado", "Em Separação", "Enviado", "Cancelado"].map(
    (s) => assuntoEmailStatusPedido(s, IDVENDA)!.subject,
  ),
);
assert.equal(assuntos.size, 4);

console.log("email-status-pedido.test.ts: ok");
