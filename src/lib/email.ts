// Envio de e-mail transacional via Resend.
// ponytail: fetch direto na REST API em vez do SDK `resend` — é um POST só.
// Sem RESEND_API_KEY o envio vira no-op (mesma postura do Sentry sem DSN),
// pra dev/preview não quebrar a moderação por falta de credencial.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

const FROM = process.env.RESEND_FROM ?? "Indústria 24h <nao-responda@industria24.com.br>";

export async function enviarEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ enviado: boolean; erro?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { enviado: false, erro: "RESEND_API_KEY ausente" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      ...(opts.html ? { html: opts.html } : {}),
    }),
  });

  if (!res.ok) return { enviado: false, erro: `Resend ${res.status}: ${await res.text()}` };
  return { enviado: true };
}

// Identidade visual "Leroy Merlin" do industria24.com.br (ver DESIGN.md —
// lm-marinho no header, lm-azul no CTA). Tabela HTML + inline styles porque
// clientes de e-mail não confiam em <style>/classes. Todo template de marca
// (carrinho, recuperar senha, confirmar cadastro) reusa esse wrapper.
function wrapperEmail(conteudoHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#EEEEF0;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEEEF0;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#102739;padding:20px 24px;">
                <img src="https://industria24.com.br/logo-industria24h.png" alt="Indústria 24h" height="28" style="display:block;height:28px;width:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">${conteudoHtml}</td>
            </tr>
            <tr>
              <td style="background:#EEEEF0;padding:16px 24px;">
                <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#7C7C7C;">Indústria 24h — industria24.com.br</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function botaoCta(link: string, texto: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#1E5A8A;border-radius:4px;">
        <a href="${link}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">${texto}</a>
      </td>
    </tr>
  </table>`;
}

export function templateCarrinhoAbandonado(itens: { nome: string; quantidade: number }[]): string {
  const linhas = itens
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#121212;">${i.quantidade}x ${i.nome}</td></tr>`,
    )
    .join("");

  return wrapperEmail(`
    <h1 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:19px;color:#121212;">Você esqueceu itens no seu carrinho</h1>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#7C7C7C;">Seu carrinho na Indústria 24h está esperando por você:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhas}</table>
    <div style="margin-top:24px;">${botaoCta("https://industria24.com.br/carrinho", "Finalizar compra")}</div>
  `);
}

// Fluxo "esqueci a senha": em vez do e-mail padrão do Supabase
// (mail.app.supabase.io, sem marca e com rate limit baixo), enviamos via
// Resend com o link de recovery gerado pelo Admin API.
export function templateRecuperarSenha(link: string): string {
  return wrapperEmail(`
    <h1 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:19px;color:#121212;">Redefinir sua senha</h1>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#7C7C7C;">Recebemos um pedido para redefinir a senha da sua conta na Indústria 24h. Se foi você, clique no botão abaixo:</p>
    ${botaoCta(link, "Redefinir senha")}
    <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7C7C7C;">Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.</p>
  `);
}

// Fluxo de cadastro (confirmação de e-mail): mesmo motivo do reset de
// senha — o e-mail padrão do Supabase não tem marca e tem rate limit
// baixo pro tráfego real de MVP.
export function templateConfirmarCadastro(link: string): string {
  return wrapperEmail(`
    <h1 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:19px;color:#121212;">Confirme seu e-mail</h1>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#7C7C7C;">Falta um passo para ativar sua conta na Indústria 24h. Clique no botão abaixo para confirmar seu e-mail:</p>
    ${botaoCta(link, "Confirmar e-mail")}
    <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7C7C7C;">Se você não criou essa conta, pode ignorar este e-mail.</p>
  `);
}

// E-mails de mudança de status_pedido. Sem coluna de rastreio em `pedidos`
// (checado em database.types.ts) — se um campo desses existir no futuro,
// incluir o link aqui; até lá, omitido em vez de inventado (regra do CLAUDE.md).
const ASSUNTOS_STATUS_PEDIDO: Record<string, (idVenda: string) => { subject: string; text: string }> = {
  "Pagamento Realizado": (idVenda) => ({
    subject: `Pagamento confirmado — pedido ${idVenda}`,
    text: `Recebemos o pagamento do seu pedido ${idVenda} na Indústria 24h. A loja já foi avisada e vai preparar seu pedido.\n\nAcompanhe em https://industria24.com.br/pedido`,
  }),
  "Em Separação": (idVenda) => ({
    subject: `Pedido em separação — pedido ${idVenda}`,
    text: `Seu pedido ${idVenda} está sendo separado pela loja.\n\nAcompanhe em https://industria24.com.br/pedido`,
  }),
  Enviado: (idVenda) => ({
    subject: `Pedido enviado — pedido ${idVenda}`,
    text: `Seu pedido ${idVenda} foi enviado.\n\nAcompanhe em https://industria24.com.br/pedido`,
  }),
  Cancelado: (idVenda) => ({
    subject: `Pedido cancelado — pedido ${idVenda}`,
    text: `Seu pedido ${idVenda} foi cancelado. Se você não esperava isso, fale com a loja pelo painel.\n\nDetalhes em https://industria24.com.br/pedido`,
  }),
};

// Lógica pura (sem IO) de qual assunto/corpo usar por status — separada
// para ser testável sem mockar Supabase/Resend.
export function assuntoEmailStatusPedido(
  status: string,
  idVenda: string,
): { subject: string; text: string } | null {
  return ASSUNTOS_STATUS_PEDIDO[status]?.(idVenda) ?? null;
}

type ServiceClient = SupabaseClient<Database>;

// Ponto único de disparo: chamar sempre que `pedidos.status_pedido` mudar
// (webhook Asaas, ações admin/seller, cancelamento). Best-effort — nunca
// lança, pra não reverter a mudança de status que já foi persistida.
export async function notificarMudancaStatusPedido(
  svc: ServiceClient,
  pedidoId: string,
  novoStatus: string,
): Promise<void> {
  try {
    if (!ASSUNTOS_STATUS_PEDIDO[novoStatus]) return; // status sem e-mail configurado

    const { data: pedido } = await svc
      .from("pedidos")
      .select("id_venda, cliente_id")
      .eq("id", pedidoId)
      .maybeSingle();
    if (!pedido?.cliente_id) return;

    const { data } = await svc.auth.admin.getUserById(pedido.cliente_id);
    const email = data.user?.email;
    if (!email) return;

    const { subject, text } = assuntoEmailStatusPedido(novoStatus, pedido.id_venda)!;
    const { enviado, erro } = await enviarEmail({ to: email, subject, text });
    if (!enviado) console.error("[notificarMudancaStatusPedido]", pedidoId, novoStatus, erro);
  } catch (erro) {
    console.error("[notificarMudancaStatusPedido]", pedidoId, novoStatus, erro);
  }
}
