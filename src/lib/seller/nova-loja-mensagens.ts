// Textos do aviso ao admin quando uma loja nova entra em análise (Issue #651,
// change `aviso-admin-nova-loja`). Puro, sem Supabase/rede — testável isolado.

import { botaoCta, wrapperEmail } from "@/lib/email";

export const EMAIL_ADMIN_NOVA_LOJA = "industria24hs@gmail.com";
export const ASSUNTO_NOVA_LOJA = "Quero vender - solicitação de cadastro";

export type DadosNovaLoja = {
  id: string;
  nome: string;
  emailContato: string | null;
  whatsapp: string | null;
  cidade: string | null;
  estado: string | null;
  criadaEm: string;
};

export function linkAdminLoja(id: string): string {
  return `https://industria24.com.br/admin/lojas/${id}`;
}

// Nome, e-mail e cidade vêm do formulário do seller: escapar antes de entrar
// no HTML, senão uma loja chamada "<a href=...>" vira link no e-mail do admin.
function esc(v: string): string {
  return v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function localidade(d: DadosNovaLoja): string | null {
  const partes = [d.cidade, d.estado].filter((p): p is string => Boolean(p));
  return partes.length ? partes.join("/") : null;
}

function dataBr(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function mensagemNovaSolicitacaoLoja(d: DadosNovaLoja): string {
  const loc = localidade(d);
  const linhas = [
    "🏪 Indústria 24h — nova solicitação de cadastro de loja",
    `Loja: ${d.nome}`,
    d.emailContato ? `Contato: ${d.emailContato}` : null,
    d.whatsapp ? `WhatsApp: ${d.whatsapp}` : null,
    loc ? `Local: ${loc}` : null,
    `Analisar: ${linkAdminLoja(d.id)}`,
  ];
  return linhas.filter(Boolean).join("\n");
}

export function textoEmailNovaSolicitacaoLoja(d: DadosNovaLoja): string {
  return `${mensagemNovaSolicitacaoLoja(d)}\nCriada em: ${dataBr(d.criadaEm)}`;
}

export function templateNovaSolicitacaoLoja(d: DadosNovaLoja): string {
  const campos: [string, string | null][] = [
    ["Loja", d.nome],
    ["Contato", d.emailContato],
    ["WhatsApp", d.whatsapp],
    ["Local", localidade(d)],
    ["Criada em", dataBr(d.criadaEm)],
  ];
  const linhas = campos
    .filter((c): c is [string, string] => Boolean(c[1]))
    .map(
      ([rotulo, valor]) =>
        `<tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7C7C7C;width:96px;">${rotulo}</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#121212;">${esc(valor)}</td></tr>`,
    )
    .join("");

  return wrapperEmail(`
    <h1 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:19px;color:#121212;">Nova solicitação de cadastro de loja</h1>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#7C7C7C;">Uma loja foi criada e está aguardando análise. Prazo de análise: 2 dias.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhas}</table>
    <div style="margin-top:24px;">${botaoCta(linkAdminLoja(d.id), "Analisar loja")}</div>
  `);
}
