// Avisos da entrega a combinar (PRD 050, 0203): seller no pedido de cotação e
// no lembrete; comprador na resposta, na recusa e na expiração. Best-effort
// por definição: a cotação já está gravada, e aviso perdido não pode desfazer
// nada. Nunca lança. O seller não recebe nome nem contato do comprador.

import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { enviarBubblewhats } from "@/lib/bubblewhats";
import { normalizeWhatsapp } from "@/lib/whatsapp";
import { enviarEmail, wrapperEmail, botaoCta } from "@/lib/email";
import { formatarCep } from "@/lib/cep";
import { dataHoraCurta, textoPrazoCotacao, textoValorCotacao } from "./cotacao-frete";

type ServiceClient = SupabaseClient<Database>;
type Cotacao = Database["public"]["Tables"]["cotacoes_frete_vendedor"]["Row"];

const SITE = "https://industria24.com.br";

async function carregar(svc: ServiceClient, id: string) {
  const { data: cot } = await svc.from("cotacoes_frete_vendedor").select("*").eq("id", id).maybeSingle();
  if (!cot) return null;
  const itens = (cot.itens as { produto_id: string; quantidade: number }[]) ?? [];
  const [{ data: produtos }, { data: loja }] = await Promise.all([
    svc.from("produtos").select("id, nome").in("id", itens.map((i) => i.produto_id)),
    svc.from("lojas").select("nome, email, whatsapp").eq("id", cot.loja_id).maybeSingle(),
  ]);
  const nomes = new Map((produtos ?? []).map((p) => [p.id, p.nome]));
  const linhas = itens.map((i) => `${nomes.get(i.produto_id) ?? "Produto"}, ${i.quantidade} un.`);
  return { cot, loja, linhas };
}

function destino(cot: Cotacao): string {
  const lugar = [cot.bairro_destino, cot.cidade_destino && cot.uf_destino ? `${cot.cidade_destino}, ${cot.uf_destino}` : cot.cidade_destino]
    .filter(Boolean)
    .join(", ");
  return `${lugar ? `${lugar} ` : ""}(CEP ${formatarCep(cot.cep_destino)})`;
}

async function paraSeller(
  loja: { email: string | null; whatsapp: string | null } | null,
  assunto: string,
  texto: string,
  html: string,
) {
  if (loja?.whatsapp) {
    const jid = normalizeWhatsapp(loja.whatsapp);
    if (jid) await enviarBubblewhats(jid, texto);
  }
  if (loja?.email) await enviarEmail({ to: loja.email, subject: assunto, text: texto, html });
}

export async function avisarSellerNovaCotacao(svc: ServiceClient, id: string, lembrete = false): Promise<void> {
  try {
    const dados = await carregar(svc, id);
    if (!dados) return;
    const { cot, loja, linhas } = dados;
    const link = `${SITE}/seller/cotacoes-frete/${cot.id}`;
    const titulo = lembrete ? "Lembrete: um cliente ainda espera o seu frete" : "Um cliente quer comprar e precisa do frete";
    const texto =
      `${titulo}\n` +
      `${linhas.join("\n")}\n` +
      `Entrega: ${destino(cot)}\n` +
      (cot.observacao ? `Observação: "${cot.observacao}"\n` : "") +
      `Responda até ${dataHoraCurta(cot.responder_ate)}. Quem responde rápido vende mais.\n` +
      `Responder: ${link}`;
    const html = wrapperEmail(`
      <h1 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:19px;color:#121212;">${titulo}</h1>
      <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#121212;">${linhas.map(escapar).join("<br>")}</p>
      <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B6B6B;">Entrega: ${destino(cot)}</p>
      ${cot.observacao ? `<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B6B6B;">Observação: "${escapar(cot.observacao)}"</p>` : ""}
      <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#121212;">Responda até ${dataHoraCurta(cot.responder_ate)}. Quem responde rápido vende mais.</p>
      ${botaoCta(link, "Responder cotação")}
    `);
    await paraSeller(loja, titulo, texto, html);
  } catch (erro) {
    Sentry.captureException(erro, { tags: { area: "cotacao_frete", signal: "aviso_seller" } });
  }
}

export async function avisarComprador(svc: ServiceClient, id: string): Promise<void> {
  try {
    const dados = await carregar(svc, id);
    if (!dados) return;
    const { cot, linhas } = dados;
    const link = cot.produto_id ? `${SITE}/produto/${cot.produto_id}` : `${SITE}/carrinho`;
    let titulo: string;
    let corpo: string;
    if (cot.status === "respondida" && cot.valor_centavos != null) {
      titulo = "O vendedor respondeu o seu frete";
      corpo =
        `${textoValorCotacao(cot.valor_centavos)}, ${textoPrazoCotacao(cot.prazo_min ?? 1, cot.prazo_max ?? 1)}.` +
        (cot.valor_carrinho_centavos != null
          ? ` Levando o carrinho inteiro da loja: ${textoValorCotacao(cot.valor_carrinho_centavos).replace("Frete combinado com o vendedor: ", "")}.`
          : "") +
        (cot.valida_ate ? ` O valor vale até ${dataHoraCurta(cot.valida_ate)}.` : "");
    } else if (cot.status === "recusada") {
      titulo = "O vendedor não entrega no seu CEP";
      corpo = "Você pode retirar na loja ou procurar outro vendedor.";
    } else {
      titulo = "O vendedor não respondeu a tempo";
      corpo = "Você pode pedir a cotação de novo.";
    }
    const texto = `${titulo}\n${linhas.join("\n")}\n${corpo}\n${link}`;

    if (cot.telefone_comprador) {
      const jid = normalizeWhatsapp(cot.telefone_comprador);
      if (jid) await enviarBubblewhats(jid, texto);
    }
    const { data: usuario } = await svc.auth.admin.getUserById(cot.comprador_id);
    const email = usuario?.user?.email;
    if (email) {
      await enviarEmail({
        to: email,
        subject: titulo,
        text: texto,
        html: wrapperEmail(`
          <h1 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:19px;color:#121212;">${titulo}</h1>
          <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B6B6B;">${linhas.map(escapar).join("<br>")}</p>
          <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#121212;">${corpo}</p>
          ${botaoCta(link, cot.status === "respondida" ? "Comprar com este frete" : "Ver o produto")}
        `),
      });
    }
  } catch (erro) {
    Sentry.captureException(erro, { tags: { area: "cotacao_frete", signal: "aviso_comprador" } });
  }
}

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
