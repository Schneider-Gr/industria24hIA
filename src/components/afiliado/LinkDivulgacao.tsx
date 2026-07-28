"use client";

import { useState } from "react";

export type AfiliacaoLink = {
  id: string;
  identificador: string | null;
  produto_id: string | null;
  loja_id: string | null;
  rotulo: string;
  aprovada: boolean;
};

/**
 * Agrupamento de todos os links de divulgação do afiliado, um por afiliação
 * Aprovada, para encaminhar ao cliente de uma vez. O `?ref=` é capturado em
 * `CapturaRef` — na página de produto quando a afiliação é por produto, ou na
 * página da loja quando é por loja inteira (produto_id nulo) — e usado por
 * `checkout_criar_pedido` para creditar a comissão a quem divulgou.
 */
export function LinkDivulgacao({
  afiliacoes,
  origem,
}: {
  afiliacoes: AfiliacaoLink[];
  origem: string;
}) {
  // Sem filtro por `tipo` de propósito: a afiliação por loja tem `porcentagem`
  // pinada em 5 para 'vendas' E 'logistica' (0015), então o afiliado logístico
  // também recebe comissão pelas vendas que trouxer. Filtrar por
  // `tipo = 'vendas'` aqui tiraria dele um repasse a que tem direito.
  const links = afiliacoes
    .filter((a) => a.aprovada && a.identificador && (a.produto_id || a.loja_id))
    .map((a) => ({
      ...a,
      url: a.produto_id
        ? `${origem}/produto/${a.produto_id}?ref=${a.identificador}`
        : `${origem}/loja/${a.loja_id}?ref=${a.identificador}`,
    }));

  if (links.length === 0) return null;

  return (
    <div className="rounded-md border border-aco-600 bg-aco-100 p-3.5">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-aco-600">
        Seus links de divulgação
      </p>

      <div className="space-y-2">
        {links.map((link) => (
          <LinkRow key={link.id} rotulo={link.rotulo} url={link.url} />
        ))}
      </div>

      <p role="status" className="mt-2 text-[11px] text-ink-2">
        Compras feitas por um destes links creditam a comissão a você.
      </p>
    </div>
  );
}

function LinkRow({ rotulo, url }: { rotulo: string; url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="rounded-sm border border-line bg-surface p-2">
      <p className="mb-1 truncate text-[12px] font-medium text-ink">{rotulo}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-sm border border-line bg-white px-2.5 py-2 text-[12px] text-ink">
          {url}
        </code>
        <button
          type="button"
          onClick={copiar}
          className="rounded-sm bg-sinal px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-sinal-escuro"
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm border border-line bg-surface px-3 py-2 text-[12px] text-ink-2 transition-colors hover:border-aco-600"
        >
          Enviar
        </a>
      </div>
    </div>
  );
}
