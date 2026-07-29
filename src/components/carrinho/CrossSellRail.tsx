"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatBRL } from "@/components/seller/format";
import { buscarCrossSell, type SugestaoCrossSell } from "@/app/carrinho/actions";
import type { ItemCarrinho } from "@/components/carrinho/carrinho";

export function CrossSellRail({ itens }: { itens: ItemCarrinho[] }) {
  const [sugestoes, setSugestoes] = useState<SugestaoCrossSell[]>([]);
  const chaveItens = itens.map((i) => i.produto_id).sort().join(",");

  useEffect(() => {
    let ativo = true;
    buscarCrossSell(itens).then((r) => {
      if (ativo) setSugestoes(r);
    });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reroda só quando o conjunto de produtos muda, não a cada mudança de quantidade
  }, [chaveItens]);

  if (sugestoes.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="font-display text-lg font-bold text-ink">Complete seu pedido</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {sugestoes.map((s) => (
          <Link
            key={s.id}
            href={`/produto/${s.id}`}
            className="w-40 shrink-0 rounded-md border border-line bg-white p-3 hover:border-lm-azul"
          >
            {s.img ? (
              <img src={s.img} alt="" className="aspect-square w-full rounded-sm object-cover" />
            ) : (
              <div className="aspect-square w-full rounded-sm bg-[#F3F4F6]" />
            )}
            <p className="mt-2 line-clamp-2 min-h-[2.5em] text-[13px] font-medium text-ink">{s.nome}</p>
            <p className="num mt-1 text-sm font-bold text-ink">{formatBRL(s.valor)}</p>
            {s.mesmaLoja ? (
              <p className="mt-1 text-[11px] text-lm-azul">mesma loja — sem novo frete</p>
            ) : (
              <p className="mt-1 text-[11px] text-muted">{s.loja_nome}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
