"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelecaoAfiliado } from "@/components/afiliado/SelecaoAfiliado";
import {
  buscarDadosLote,
  consultarAfiliacoesExistentes,
  efetivarAfiliacoesLote,
  type ProdutoLote,
  type StatusAfiliacaoExistente,
} from "../actions";

/**
 * Tela de revisão pós-login do lote (openspec afiliado-selecao-lote): lista
 * os produtos selecionados na vitrine, sinaliza duplicados, cobra um único
 * aceite de termos e efetiva tudo numa Server Action só.
 */
export default function LotePage() {
  const { itens, limpar } = useSelecaoAfiliado();
  const router = useRouter();

  const [dados, setDados] = useState<ProdutoLote[] | null>(null);
  const [existentes, setExistentes] = useState<StatusAfiliacaoExistente[]>([]);
  const [removidos, setRemovidos] = useState<Set<string>>(new Set());
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ criadas: number; ignoradas: number } | null>(null);

  useEffect(() => {
    if (itens.length === 0) {
      setDados([]);
      return;
    }
    const produtoIds = itens.map((i) => i.produto_id);
    Promise.all([buscarDadosLote(produtoIds), consultarAfiliacoesExistentes(produtoIds)])
      .then(([d, e]) => {
        setDados(d);
        setExistentes(e);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar o lote."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusPorProduto = new Map(existentes.map((e) => [e.produto_id, e.status]));

  const linhas = (dados ?? []).filter((d) => !removidos.has(d.produto_id));
  const novos = linhas.filter((d) => !statusPorProduto.has(d.produto_id));
  const duplicados = linhas.filter((d) => statusPorProduto.has(d.produto_id));

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    try {
      const r = await efetivarAfiliacoesLote(
        novos.map((n) => n.produto_id),
        aceite,
      );
      setResultado(r);
      limpar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao efetivar o lote.");
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <div className="p-6">
        <h1 className="font-display text-xl font-bold text-ink">Afiliações criadas</h1>
        <p className="mt-2 text-sm text-ink-2">
          {resultado.criadas} nova{resultado.criadas === 1 ? "" : "s"} afiliação
          {resultado.criadas === 1 ? "" : "ões"} criada{resultado.criadas === 1 ? "" : "s"} com status
          Pendente.
        </p>
        <a href="/afiliado" className="mt-4 inline-block text-sm font-semibold text-sinal underline">
          Ir para o painel do afiliado
        </a>
      </div>
    );
  }

  if (dados === null) {
    return <div className="p-6 text-sm text-muted">Carregando lote...</div>;
  }

  if (itens.length === 0) {
    return (
      <div className="p-6">
        <h1 className="font-display text-xl font-bold text-ink">Nenhum produto selecionado</h1>
        <p className="mt-2 text-sm text-ink-2">
          Volte para a vitrine e marque produtos com &quot;Afiliar-se&quot; para montar um lote.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
        >
          Ir para a vitrine
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="font-display text-xl font-bold text-ink">Revisar afiliações</h1>
      <p className="mt-1 text-sm text-ink-2">
        Confira os produtos selecionados antes de confirmar.
      </p>

      {erro && (
        <p className="mt-3 rounded bg-vermelho/10 px-3 py-2 text-sm text-vermelho">{erro}</p>
      )}

      {novos.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-2">
            Novos ({novos.length})
          </h2>
          <ul className="space-y-2">
            {novos.map((d) => (
              <li
                key={d.produto_id}
                className="flex items-center justify-between rounded border border-borda p-2.5"
              >
                <div>
                  <p className="text-sm text-ink">{d.nome}</p>
                  <p className="text-xs text-secundario">
                    {d.loja_nome} · comissão <span className="num">{d.porcentagem_afiliado}%</span>
                    {!d.permite_afiliacao && (
                      <span className="ml-1 text-vermelho">(não permite mais afiliação)</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRemovidos((s) => new Set(s).add(d.produto_id))}
                  className="text-xs font-medium text-vermelho hover:underline"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {duplicados.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-2">
            Já afiliados ({duplicados.length})
          </h2>
          <ul className="space-y-2">
            {duplicados.map((d) => (
              <li
                key={d.produto_id}
                className="flex items-center justify-between rounded border border-line bg-lm-cinza p-2.5 opacity-80"
              >
                <p className="text-sm text-ink">{d.nome}</p>
                <span className="text-xs font-medium text-secundario">
                  {statusPorProduto.get(d.produto_id)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {novos.length > 0 && (
        <div className="mt-6 space-y-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
              className="h-4 w-4"
            />
            Li e aceito os{" "}
            <a
              href="/termos/termos-afiliado-vendas"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sinal underline"
            >
              Termos do Afiliado de Vendas
            </a>{" "}
            para todo o lote
          </label>
          <button
            type="button"
            disabled={!aceite || enviando}
            onClick={confirmar}
            className="rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            {enviando ? "Confirmando..." : `Confirmar ${novos.length} afiliação${novos.length === 1 ? "" : "ões"}`}
          </button>
        </div>
      )}
    </div>
  );
}
