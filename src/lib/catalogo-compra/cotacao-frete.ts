// Regras de tela da entrega a combinar (PRD 050, change
// entrega-a-combinar-cotacao). O que protege o dinheiro (chave dos itens,
// validade, dono da cotação, bloqueio de contato) é conferido no banco pela
// migration 0203; aqui ficam só as decisões de exibição e as mensagens.

import { formatBRL } from "@/components/seller/format";

// Espelho de public.cotacao_observacao_tem_contato (0203). Telefone = 9+
// dígitos com separador simples, para que um CEP de 8 dígitos passe.
const TELEFONE = /(\d[\s().-]?){9,}/;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/i;
const PIX_ALEATORIA = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const LINK = /(https?:\/\/|www\.|\.(com|br|net|org)(\/|\s|$))/i;

export function observacaoTemContato(texto: string): boolean {
  return TELEFONE.test(texto) || EMAIL.test(texto) || PIX_ALEATORIA.test(texto) || LINK.test(texto);
}

export const MSG_OBSERVACAO_CONTATO =
  "Não inclua telefone, e-mail, Pix ou links. Depois da compra você conversa com o vendedor pelo chat.";

export function textoValorCotacao(valorCentavos: number): string {
  return valorCentavos === 0
    ? "Frete grátis combinado com o vendedor"
    : `Frete combinado com o vendedor: ${formatBRL(valorCentavos / 100)}`;
}

export function textoPrazoCotacao(min: number, max: number): string {
  if (min === max) return min === 1 ? "1 dia útil" : `${min} dias úteis`;
  return `de ${min} a ${max} dias úteis`;
}

export type DecisaoPdp = "mostrar" | "fora_da_regiao" | "nao_se_aplica";

/** Produto com frete a combinar só entrega onde declarou; sem faixa
 * declarada, só na UF do CEP de origem (decisão 3 do PRD 050). */
export function exibirEntregaACombinar(a: {
  lojaFlag: boolean;
  produtoFlag: boolean;
  temFaixas: boolean;
  cepNaFaixa: boolean;
  ufDestino: string | null;
  ufOrigem: string | null;
}): DecisaoPdp {
  if (!a.lojaFlag || !a.produtoFlag) return "nao_se_aplica";
  if (a.temFaixas) return a.cepNaFaixa ? "mostrar" : "fora_da_regiao";
  if (!a.ufDestino || !a.ufOrigem) return "fora_da_regiao";
  return a.ufDestino.toUpperCase() === a.ufOrigem.toUpperCase() ? "mostrar" : "fora_da_regiao";
}

/** Espelho de public.cotacao_status_efetivo (0203) para a tela. */
export function statusEfetivo(
  c: { status: string; responder_ate: string; valida_ate: string | null },
  agora: Date = new Date(),
): string {
  if (c.status === "aguardando" && new Date(c.responder_ate) < agora) return "expirada";
  if (c.status === "respondida" && c.valida_ate && new Date(c.valida_ate) < agora) return "vencida";
  return c.status;
}

const fmtHora = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Manaus",
});

export function dataHoraCurta(iso: string): string {
  return fmtHora.format(new Date(iso));
}

/** Texto do estado da cotação para o comprador; `null` quando há valor a
 * exibir (respondida), que a tela monta com valor, prazo e validade. */
export function mensagemStatusCotacao(c: { status: string; responder_ate?: string | null }): string | null {
  switch (c.status) {
    case "aguardando":
      return `Aguardando o vendedor. Ele responde até ${c.responder_ate ? dataHoraCurta(c.responder_ate) : "24 horas"}, e avisamos você por e-mail e WhatsApp.`;
    case "recusada":
      return "O vendedor não entrega nesse CEP. Você pode retirar na loja ou procurar outro vendedor.";
    case "expirada":
      return "O vendedor não respondeu a tempo. Você pode pedir de novo.";
    case "vencida":
      return "A cotação venceu. Você pode pedir de novo.";
    case "usada":
      return "Esta cotação já foi usada num pedido.";
    default:
      return null;
  }
}
