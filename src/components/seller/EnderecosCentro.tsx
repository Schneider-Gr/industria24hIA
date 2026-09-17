import {
  alternarBloqueioEndereco,
  criarEndereco,
  excluirEndereco,
} from "@/app/(seller)/seller/centros/actions";

export type EnderecoArmazenagem = {
  id: string;
  codigo: string;
  rua: string;
  predio: string;
  nivel: string;
  apartamento: string;
  bloqueado: boolean;
  motivo_bloqueio: string | null;
  saldo: number;
};

const inputCls =
  "w-full rounded border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-lm-azul";

const btnCls =
  "rounded border border-line px-2 py-1 text-xs font-semibold text-ink-2 hover:bg-surface";

/**
 * Posições de armazenagem de um centro. É a Fase 2 do armazenamento (US02 do PRD
 * 039): o centro deixa de ser uma caixa preta e passa a ter lugar onde a
 * mercadoria fica. No CD operado pelo Indústria o endereço é obrigatório para
 * qualquer lançamento; no CD do seller é opcional, e por isso a seção aparece
 * recolhida por padrão.
 */
export function EnderecosCentro({
  centroId,
  enderecos,
  obrigatorio,
}: {
  centroId: string;
  enderecos: EnderecoArmazenagem[];
  obrigatorio: boolean;
}) {
  return (
    <details open={obrigatorio || enderecos.length > 0}>
      <summary className="cursor-pointer text-sm font-semibold text-ink-2">
        Endereços de armazenagem ({enderecos.length})
        {obrigatorio && (
          <span className="ml-2 rounded bg-lm-azul/10 px-2 py-0.5 text-[11px] font-medium text-lm-azul">
            obrigatório neste centro
          </span>
        )}
      </summary>

      <div className="mt-3 space-y-3">
        {enderecos.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhuma posição cadastrada. Sem endereço, ninguém acha a mercadoria no
            galpão sem perguntar a quem guardou.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded border border-line">
            {enderecos.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <span className="font-mono font-semibold text-ink">{e.codigo}</span>
                <span className="text-muted">
                  {e.saldo} {e.saldo === 1 ? "unidade" : "unidades"}
                </span>
                {e.bloqueado && (
                  <span className="rounded bg-erro/10 px-2 py-0.5 text-xs font-medium text-erro">
                    Bloqueado: {e.motivo_bloqueio}
                  </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <form action={alternarBloqueioEndereco} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="bloquear" value={e.bloqueado ? "0" : "1"} />
                    {!e.bloqueado && (
                      <input
                        name="motivo"
                        required
                        placeholder="Motivo do bloqueio"
                        className={`${inputCls} w-40`}
                      />
                    )}
                    <button type="submit" className={btnCls}>
                      {e.bloqueado ? "Desbloquear" : "Bloquear"}
                    </button>
                  </form>

                  <form action={excluirEndereco}>
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      className="rounded border border-line px-2 py-1 text-xs font-semibold text-erro hover:bg-erro/10"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form action={criarEndereco} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="centro_id" value={centroId} />
          {[
            ["rua", "Rua"],
            ["predio", "Prédio"],
            ["nivel", "Nível"],
            ["apartamento", "Apto"],
          ].map(([campo, rotulo]) => (
            <label key={campo} className="text-xs text-muted">
              {rotulo}
              <input name={campo} required className={`${inputCls} mt-1 w-20`} />
            </label>
          ))}
          <button
            type="submit"
            className="rounded bg-lm-azul px-4 py-1.5 text-sm font-semibold text-white hover:bg-lm-azul-escuro"
          >
            Adicionar posição
          </button>
        </form>
      </div>
    </details>
  );
}
