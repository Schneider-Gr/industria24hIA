"use client";

import { formatBRL } from "@/components/seller/format";
import { GaleriaCarrossel } from "@/components/vitrine/BannerGalerias";
import { formatDataCurtaAno, type VendaFuturaItem } from "@/components/vitrine/MercadoFuturo";

/**
 * Galeria de rolagem lateral com produtos de venda futura, misturando
 * lojas diferentes (mesmo padrão visual das demais `GaleriaCarrossel` da
 * home). Complementa a seção `MercadoFuturo` (abas por data): aqui é uma
 * vitrine única, sem filtro de data, pensada pra navegação por scroll.
 */
export function VendaFuturaGaleria({ itens }: { itens: VendaFuturaItem[] }) {
  // Um card por produto: mantém a previsão mais próxima quando o mesmo
  // produto tem mais de uma data futura cadastrada.
  const porProduto = new Map<string, VendaFuturaItem>();
  for (const item of itens) {
    const atual = porProduto.get(item.produto_id);
    if (!atual || item.previsao < atual.previsao) {
      porProduto.set(item.produto_id, item);
    }
  }
  const produtosUnicos = [...porProduto.values()].sort((a, b) =>
    a.previsao.localeCompare(b.previsao),
  );

  return (
    <GaleriaCarrossel
      titulo="Produtos com venda futura"
      itens={produtosUnicos}
      keyFn={(item) => item.produto_id}
      itemClassName="w-[45%] shrink-0 snap-start sm:w-[30%] md:w-[22%] lg:w-[15%]"
      renderItem={(item) => (
        <a
          href={`/produto/${item.produto_id}`}
          className="group flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface transition-[border-color,box-shadow] duration-150 hover:border-vf-roxo hover:shadow-[0_4px_16px_rgba(30,90,138,.12)]"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F3F4F6]">
            {item.img ? (
              <img
                src={item.img}
                alt={item.produto_nome}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                sem imagem
              </div>
            )}
            <span className="absolute left-2 top-2 rounded-sm bg-vf-roxo px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-white">
              Venda futura
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 p-2.5">
            <p className="line-clamp-2 text-[13px] leading-snug text-ink">{item.produto_nome}</p>
            <p className="text-[11px] text-muted">{item.loja_nome}</p>
            <span className="num mt-1 text-[15px] font-bold leading-tight text-ink">
              {formatBRL(item.valor ?? item.preco_base)}
            </span>
            <p className="text-[11px] text-muted">Disponível em {formatDataCurtaAno(item.previsao)}</p>
          </div>
        </a>
      )}
    />
  );
}
