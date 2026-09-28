"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  cancelarCotacaoFrete,
  estadoEntregaACombinar,
  pedirCotacaoFrete,
  type CotacaoResumo,
  type PedidoCotacaoState,
} from "@/app/cotacoes-frete/actions";
import { formatarCep } from "@/lib/cep";
import {
  MSG_OBSERVACAO_CONTATO,
  dataHoraCurta,
  mensagemStatusCotacao,
  textoPrazoCotacao,
  textoValorCotacao,
} from "@/lib/catalogo-compra/cotacao-frete";

const inputCls =
  "mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-lm-azul focus:outline-none";

type Item = { produto_id: string; quantidade: number };

/** Entrega a combinar (PRD 050). Na página do produto, o comprador escolhe a
 * quantidade; no checkout, os itens vêm prontos (`itensFixos`) e o valor do
 * carrinho inteiro da loja pode ser pedido junto (`itensCarrinho`). */
export function EntregaACombinar({
  produtoId,
  quantidadeInicial = 1,
  cepInicial,
  itensFixos,
  itensCarrinho,
  semEstado = false,
  onEnviado,
}: {
  produtoId: string;
  quantidadeInicial?: number;
  cepInicial: string | null;
  itensFixos?: Item[];
  itensCarrinho?: Item[];
  /** No checkout o estado vem da rota de cotação, casado com os itens do
   * carrinho; aqui o componente só oferece o pedido. */
  semEstado?: boolean;
  onEnviado?: () => void;
}) {
  const [cep, setCep] = useState(cepInicial ?? "");
  const [quantidade, setQuantidade] = useState(quantidadeInicial);
  const [aberto, setAberto] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [telefone, setTelefone] = useState("");
  const [estado, setEstado] = useState<Awaited<ReturnType<typeof estadoEntregaACombinar>> | null>(null);
  const [versao, setVersao] = useState(0);
  const [resultado, enviar, enviando] = useActionState<PedidoCotacaoState, FormData>(pedirCotacaoFrete, { ok: false });

  useEffect(() => {
    let ativo = true;
    estadoEntregaACombinar(produtoId, cep.replace(/\D/g, "").length === 8 ? cep : null).then((e) => {
      if (ativo) setEstado(e);
    });
    return () => {
      ativo = false;
    };
  }, [produtoId, cep, versao]);

  useEffect(() => {
    if (!resultado.ok) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fecha o formulário e recarrega o estado depois do envio
    setAberto(false);
    setVersao((v) => v + 1);
    onEnviado?.();
  }, [resultado, onEnviado]);

  const itens: Item[] = itensFixos ?? [{ produto_id: produtoId, quantidade }];
  const cotacao: CotacaoResumo | null = semEstado ? null : (estado?.cotacao ?? null);
  const mensagem = cotacao ? mensagemStatusCotacao(cotacao) : null;

  if (estado?.decisao === "nao_se_aplica") return null;

  return (
    <section className="rounded border border-lm-azul/30 bg-lm-azul/5 p-4 text-sm">
      <h3 className="font-display text-base font-semibold text-ink">Combine a entrega com o vendedor</h3>
      <p className="mt-1 text-muted">
        {estado?.origem ? `Este produto sai de ${estado.origem}. ` : ""}O frete para o seu CEP não é calculado
        automaticamente: o vendedor informa o valor e o prazo para você. Você paga o produto e o frete juntos, com a
        garantia da Indústria 24h.
      </p>

      {estado?.decisao === "fora_da_regiao" && (
        <p className="mt-2 font-medium text-erro">Não entregamos na sua região. Você pode retirar na loja, se ela permitir.</p>
      )}

      {cotacao?.status === "respondida" && cotacao.valor_centavos != null && (
        <p className="mt-2 rounded border border-ok/40 bg-ok/10 p-2">
          {textoValorCotacao(cotacao.valor_centavos)}, {textoPrazoCotacao(cotacao.prazo_min ?? 1, cotacao.prazo_max ?? 1)}
          {!itensFixos && ` (para ${cotacao.quantidade} un.)`}.
          {cotacao.valida_ate && ` Vale até ${dataHoraCurta(cotacao.valida_ate)}.`}
        </p>
      )}
      {mensagem && <p className="mt-2 rounded border border-line bg-white p-2">{mensagem}</p>}
      {cotacao?.status === "aguardando" && (
        <button
          type="button"
          onClick={async () => {
            await cancelarCotacaoFrete(cotacao.id);
            setVersao((v) => v + 1);
          }}
          className="mt-1 text-[12px] text-muted underline underline-offset-2"
        >
          Cancelar pedido de cotação
        </button>
      )}

      {estado?.decisao !== "fora_da_regiao" &&
        (estado && !estado.logado ? (
          <Link
            href={`/login?next=${encodeURIComponent(itensFixos ? "/checkout" : `/produto/${produtoId}`)}`}
            className="mt-3 inline-flex rounded bg-lm-azul px-4 py-2 font-semibold text-white hover:bg-lm-azul-escuro"
          >
            Entrar para pedir cotação de frete
          </Link>
        ) : !aberto ? (
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="mt-3 inline-flex rounded bg-lm-azul px-4 py-2 font-semibold text-white hover:bg-lm-azul-escuro"
          >
            {cotacao && cotacao.status !== "aguardando" ? "Pedir nova cotação" : "Pedir cotação de frete"}
          </button>
        ) : (
          // div, não form: no checkout este bloco fica dentro do <form> da
          // compra, e form aninhado não é HTML válido.
          <div className="mt-3 space-y-2">
            <p className="font-semibold text-ink">Peça o frete ao vendedor</p>
            <label className="block">
              <span className="text-ink-2">CEP de entrega *</span>
              <input
                value={cep}
                onChange={(e) => setCep(formatarCep(e.target.value))}
                inputMode="numeric"
                placeholder="69000-000"
                className={inputCls}
              />
            </label>
            {!itensFixos && (
              <label className="block">
                <span className="text-ink-2">Quantidade *</span>
                <input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  className={inputCls}
                />
              </label>
            )}
            <label className="block">
              <span className="text-ink-2">Observação para o vendedor</span>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Ex.: entregar no depósito dos fundos, rua sem saída para caminhão."
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-ink-2">Seu WhatsApp para o aviso da resposta</span>
              <input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" placeholder="92 99999-9999" className={inputCls} />
              <span className="mt-1 block text-[11px] text-muted">O vendedor não vê o seu número.</span>
            </label>
            <p className="text-[12px] text-muted">{MSG_OBSERVACAO_CONTATO} Resposta em até 24 horas.</p>
            <button
              type="button"
              disabled={enviando}
              onClick={() => {
                const dados = new FormData();
                dados.set("itens", JSON.stringify(itens));
                if (itensCarrinho?.length) dados.set("itens_carrinho", JSON.stringify(itensCarrinho));
                dados.set("cep", cep);
                dados.set("produto_id", produtoId);
                dados.set("observacao", observacao);
                dados.set("telefone", telefone);
                startTransition(() => enviar(dados));
              }}
              className="inline-flex rounded bg-lm-azul px-4 py-2 font-semibold text-white hover:bg-lm-azul-escuro disabled:opacity-50"
            >
              {enviando ? "Enviando…" : "Enviar pedido de cotação"}
            </button>
            {resultado.error && <p className="text-erro">{resultado.error}</p>}
          </div>
        ))}
    </section>
  );
}
