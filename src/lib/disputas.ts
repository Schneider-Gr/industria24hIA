// Regras puras de disputa (PRD 009 US01, PRD 010 US03) — sem I/O, para
// permitir teste unitário sem arrastar o cliente Supabase.

const JANELA_PADRAO_DIAS = 7;
const JANELA_PERECIVEL_HORAS = 24;
const SLA_LOJA_HORAS = 48;
const SLA_ADMIN_HORAS = 24;
const PRAZO_CONFIRMACAO_COMPRADOR_DIAS = 3;

export const MOTIVOS_PADRAO = [
  { value: "produto_avariado", label: "Produto avariado" },
  { value: "produto_diferente_anunciado", label: "Produto diferente do anunciado" },
  { value: "produto_nao_entregue", label: "Produto não entregue" },
  { value: "quantidade_incorreta", label: "Quantidade incorreta" },
  { value: "outro", label: "Outro" },
] as const;

export const MOTIVO_PERECIVEL = { value: "produto_estragado_ou_vencido", label: "Chegou estragado/fora da validade" } as const;

export function motivosDisponiveis(perecivel: boolean) {
  return perecivel ? [MOTIVO_PERECIVEL, ...MOTIVOS_PADRAO] : MOTIVOS_PADRAO;
}

/** Prazo final para abrir disputa após a entrega confirmada. */
export function janelaDisputaVenceEm(entregaConfirmadaEm: Date, perecivel: boolean): Date {
  const venceEm = new Date(entregaConfirmadaEm);
  if (perecivel) {
    venceEm.setHours(venceEm.getHours() + JANELA_PERECIVEL_HORAS);
  } else {
    venceEm.setDate(venceEm.getDate() + JANELA_PADRAO_DIAS);
  }
  return venceEm;
}

export function podeAbrirDisputa(
  entregaConfirmadaEm: Date,
  perecivel: boolean,
  agora: Date = new Date(),
): boolean {
  return agora <= janelaDisputaVenceEm(entregaConfirmadaEm, perecivel);
}

/** Prazo até quando a loja pode responder antes do comprador poder escalar. */
export function slaLojaVenceEm(abertaEm: Date): Date {
  const venceEm = new Date(abertaEm);
  venceEm.setHours(venceEm.getHours() + SLA_LOJA_HORAS);
  return venceEm;
}

export function podeEscalar(slaVenceEm: Date, agora: Date = new Date()): boolean {
  return agora >= slaVenceEm;
}

/**
 * Prazo até quando o admin deveria atuar numa disputa escalada (24h, PRD
 * 009 §2). Não é um gate de RLS — só indica "atrasado" na fila do admin,
 * sem consequência automática (ver Registro de Decisões do PRD).
 */
export function slaAdminVenceEm(escaladaEm: Date): Date {
  const venceEm = new Date(escaladaEm);
  venceEm.setHours(venceEm.getHours() + SLA_ADMIN_HORAS);
  return venceEm;
}

export function mediacaoAdminAtrasada(escaladaEm: Date, agora: Date = new Date()): boolean {
  return agora >= slaAdminVenceEm(escaladaEm);
}

/**
 * Data de referência (3 dias após a proposta da loja) usada só para exibir
 * um lembrete ao comprador na UI — confirmar ou recusar já é permitido a
 * qualquer momento a partir da proposta, sem trava de tempo (RLS 0115).
 */
export function lembreteConfirmacaoVenceEm(propostaEm: Date): Date {
  const venceEm = new Date(propostaEm);
  venceEm.setDate(venceEm.getDate() + PRAZO_CONFIRMACAO_COMPRADOR_DIAS);
  return venceEm;
}

/**
 * Foto é obrigatória para abrir disputa de item perecível ou de venda
 * futura (mesma exigência de evidência — sem foto não dá pra avaliar
 * devolução parcial de item de venda futura, ver validarDecisaoVendaFutura).
 */
export function validarFotosAbertura(
  perecivel: boolean,
  quantidadeFotos: number,
  vendaFutura = false,
): void {
  if (perecivel && quantidadeFotos < 1) {
    throw new Error("Disputa de produto perecível exige ao menos uma foto.");
  }
  if (vendaFutura && quantidadeFotos < 1) {
    throw new Error("Disputa de item de venda futura exige ao menos uma foto.");
  }
}

/**
 * Desfecho de disputa de item de venda futura fica restrito a reembolso
 * parcial (proporcional ao defeito mostrado nas fotos) ou negada — o item
 * já foi entregue/consumido no momento da colheita/produção, não há troca
 * nem devolução física possível.
 */
export function validarDecisaoVendaFutura(decisao: string, vendaFutura: boolean): void {
  if (vendaFutura && (decisao === "troca" || decisao === "reembolso_total")) {
    throw new Error("Item de venda futura só aceita reembolso parcial ou negada.");
  }
}

/** Motivo "produto_estragado_ou_vencido" só é válido para item perecível. */
export function validarMotivo(motivo: string, perecivel: boolean): void {
  if (motivo === "produto_estragado_ou_vencido" && !perecivel) {
    throw new Error("Motivo só disponível para produtos perecíveis.");
  }
}

/** Reembolso parcial não pode exceder o valor do item em disputa. */
export function validarValorReembolso(decisao: string, valor: number | null, valorItem: number): void {
  if (decisao === "reembolso_parcial") {
    if (valor == null || valor <= 0) {
      throw new Error("Informe o valor do reembolso parcial.");
    }
    if (valor > valorItem) {
      throw new Error("Reembolso parcial não pode ser maior que o valor do item.");
    }
  }
}
