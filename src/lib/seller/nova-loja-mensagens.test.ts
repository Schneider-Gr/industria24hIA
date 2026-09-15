import assert from "node:assert/strict";
import { test } from "vitest";
import {
  ASSUNTO_NOVA_LOJA,
  EMAIL_ADMIN_NOVA_LOJA,
  linkAdminLoja,
  mensagemNovaSolicitacaoLoja,
  templateNovaSolicitacaoLoja,
  textoEmailNovaSolicitacaoLoja,
  type DadosNovaLoja,
} from "./nova-loja-mensagens";

const completa: DadosNovaLoja = {
  id: "00ed9432-b3a0-4231-a35a-0981e263e6df",
  nome: "Metalúrgica Teste",
  emailContato: "seller@example.com",
  whatsapp: "(92) 99999-0000",
  cidade: "Manaus",
  estado: "AM",
  criadaEm: "2026-09-15T17:17:42Z",
};

const soNome: DadosNovaLoja = {
  ...completa,
  emailContato: null,
  whatsapp: null,
  cidade: null,
  estado: null,
};

test("destinatário e assunto do e-mail são os definidos pela dona do produto", () => {
  assert.equal(EMAIL_ADMIN_NOVA_LOJA, "industria24hs@gmail.com");
  assert.equal(ASSUNTO_NOVA_LOJA, "Quero vender - solicitação de cadastro");
});

test("WhatsApp: anuncia a solicitação com loja, contato, local e link do admin", () => {
  const msg = mensagemNovaSolicitacaoLoja(completa);
  assert.match(msg, /nova solicitação de cadastro de loja/i);
  assert.match(msg, /Loja: Metalúrgica Teste/);
  assert.match(msg, /Contato: seller@example\.com/);
  assert.match(msg, /Local: Manaus\/AM/);
  assert.ok(msg.includes(linkAdminLoja(completa.id)));
});

test("loja criada só com o nome: nada de null/undefined nem linhas vazias", () => {
  const msg = mensagemNovaSolicitacaoLoja(soNome);
  const html = templateNovaSolicitacaoLoja(soNome);
  const texto = textoEmailNovaSolicitacaoLoja(soNome);
  for (const s of [msg, html, texto]) {
    assert.doesNotMatch(s, /null|undefined/);
  }
  assert.doesNotMatch(msg, /Contato:|WhatsApp:|Local:/);
  assert.ok(html.includes(linkAdminLoja(soNome.id)));
});

test("e-mail HTML escapa dados digitados pelo seller", () => {
  const html = templateNovaSolicitacaoLoja({ ...completa, nome: '<a href="https://golpe">x</a>' });
  assert.doesNotMatch(html, /<a href="https:\/\/golpe">/);
  assert.match(html, /&#60;a href=&#34;https:\/\/golpe&#34;&#62;/);
});
