import { formatBRL } from "@/components/seller/format";
import { precoLote, proximoLote, economiaPorUnidade, type Lote } from "@/lib/coletiva";

// Régua dos lotes progressivos: mostra onde a coletiva está, qual preço já
// venceu e quanto falta para o próximo lote. Substitui a barra simples quando
// o produto tem curva configurada (migration 0076).
export function ReguaLotes({
  lotes,
  atual,
  meta,
  base,
}: {
  lotes: Lote[];
  atual: number;
  meta: number;
  base: number;
}) {
  const alvo = Math.max(meta, ...lotes.map((l) => l.min_qtd), atual);
  const pct = Math.min(100, Math.round((atual / alvo) * 100));
  const preco = precoLote(lotes, atual, base);
  const proximo = proximoLote(lotes, atual);

  return (
    <div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-ok transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span className="num text-[#7C7C7C]">
          {atual} de {alvo} un ({pct}%)
        </span>
        <span className="num font-semibold text-ok">
          preço agora {formatBRL(preco)}/un
        </span>
      </div>

      <ul className="mt-3 grid gap-1 text-xs">
        {lotes.map((l) => {
          const atingido = atual >= l.min_qtd;
          return (
            <li
              key={l.min_qtd}
              className={`num flex items-center justify-between rounded px-2 py-1 ${
                atingido ? "bg-ok/10 text-ok" : "bg-surface text-[#7C7C7C]"
              }`}
            >
              <span>
                {atingido ? "✓" : "•"} a partir de {l.min_qtd} un
              </span>
              <span className="font-semibold">{formatBRL(l.valor_unitario)}/un</span>
            </li>
          );
        })}
      </ul>

      {proximo && (
        <p className="num mt-2 text-xs text-[#374151]">
          Faltam <strong>{proximo.min_qtd - atual} un</strong> para o lote de{" "}
          {formatBRL(proximo.valor_unitario)}/un — mais{" "}
          {formatBRL(economiaPorUnidade(preco, proximo.valor_unitario))} de economia por
          unidade para <em>todos</em> os participantes.
        </p>
      )}
    </div>
  );
}
