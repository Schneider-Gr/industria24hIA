"use client";

import { useState } from "react";
import { IconBusca, IconChevron, IconMarcado, IconPin } from "@/components/seller/icons";
import { formatarCep } from "@/lib/cep";
import {
  IBGE_MANAUS,
  UFS_HABILITADAS,
  ZONAS_MANAUS,
  municipioDoCep,
  municipiosDaUf,
  ufDoCep,
} from "@/lib/logistica-parceiro/area";
import { BAIRROS_MANAUS } from "@/lib/logistica-parceiro/bairros-manaus";

const campo =
  "h-12 w-full rounded border border-line bg-surface px-3 text-base text-ink outline-none transition-colors focus:border-lm-azul focus:ring-2 focus:ring-lm-azul/20 sm:h-10 sm:text-sm";

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lm-azul sm:min-h-9 ${
        ativo
          ? "border-lm-azul bg-lm-azul font-semibold text-white"
          : "border-line bg-surface text-ink hover:border-lm-azul"
      }`}
    >
      {ativo && <IconMarcado className="size-3.5" />}
      {children}
    </button>
  );
}

function Linha({ titulo, contagem, destaque }: { titulo: string; contagem: string; destaque: boolean }) {
  return (
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3.5 select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lm-azul [&::-webkit-details-marker]:hidden">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{titulo}</span>
      <span className={`num text-xs ${destaque ? "font-semibold text-lm-azul" : "text-muted"}`}>{contagem}</span>
      <IconChevron className="size-4 shrink-0 text-muted transition-transform duration-150 group-open:rotate-90" />
    </summary>
  );
}

/** CEP base + área de atuação. O estado sai do CEP; dentro dele o parceiro
 *  marca cidades e, em Manaus, bairros por zona. Os marcados seguem no form
 *  como campos ocultos `cidade` e `bairro`. */
export function AreaAtuacao({
  cepInicial,
  cidadesIniciais,
  bairrosIniciais,
}: {
  cepInicial: string;
  cidadesIniciais: string[];
  bairrosIniciais: string[];
}) {
  const [cep, setCep] = useState(formatarCep(cepInicial));
  const [bairros, setBairros] = useState(
    () => new Set<string>(cidadesIniciais.includes(IBGE_MANAUS) ? BAIRROS_MANAUS : bairrosIniciais),
  );
  const [cidades, setCidades] = useState(() => new Set(cidadesIniciais.filter((c) => c !== IBGE_MANAUS)));
  const [busca, setBusca] = useState("");

  const uf = ufDoCep(cep);
  const base = municipioDoCep(cep);
  const estado = uf ? UFS_HABILITADAS[uf] : undefined;
  const temManaus = uf === "AM";
  const outras = estado && uf ? municipiosDaUf(uf).filter((m) => m.ibge !== IBGE_MANAUS) : [];
  const cidadesDoEstado = outras.filter((m) => cidades.has(m.ibge));
  const nBairros = temManaus ? bairros.size : 0;

  function alternar(conjunto: Set<string>, grava: (s: Set<string>) => void, valores: readonly string[], ligar?: boolean) {
    const novo = new Set(conjunto);
    const marcar = ligar ?? !valores.every((v) => novo.has(v));
    for (const v of valores) {
      if (marcar) novo.add(v);
      else novo.delete(v);
    }
    grava(novo);
  }

  const termo = busca.trim().toLowerCase();
  const visiveis = termo ? outras.filter((m) => m.nome.toLowerCase().includes(termo)) : outras;

  const resumo = [
    nBairros === BAIRROS_MANAUS.length
      ? "Manaus inteira"
      : nBairros > 0
        ? `${nBairros} ${nBairros === 1 ? "bairro" : "bairros"} de Manaus`
        : null,
    cidadesDoEstado.length > 0
      ? `${cidadesDoEstado.length} ${cidadesDoEstado.length === 1 ? "cidade" : "cidades"}`
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-[13px] font-medium text-ink-2">CEP de onde você sai</span>
        <input
          name="cep_base"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="69000-000"
          maxLength={9}
          value={cep}
          onChange={(e) => setCep(formatarCep(e.currentTarget.value))}
          className={`${campo} num mt-1`}
        />
      </label>

      {temManaus && [...bairros].map((b) => <input key={b} type="hidden" name="bairro" value={b} />)}
      {cidadesDoEstado.map((m) => (
        <input key={m.ibge} type="hidden" name="cidade" value={m.ibge} />
      ))}

      {uf === null && (
        <p className="text-sm text-muted">Com o CEP a gente identifica o seu estado e mostra as cidades que você pode atender.</p>
      )}

      {uf !== null && !estado && (
        <p className="rounded-lg bg-lm-cinza px-3.5 py-3 text-sm text-ink-2">
          Ainda não operamos no seu estado. Pode concluir o cadastro: ele fica salvo e avisamos quando abrirmos a sua região.
        </p>
      )}

      {estado && (
        <>
          <p className="flex items-start gap-2 text-sm text-ink-2">
            <IconPin className="mt-0.5 size-4 shrink-0 text-lm-azul" />
            <span>
              <strong className="font-semibold text-ink">
                {base?.nome}, {estado}.
              </strong>{" "}
              {resumo.length > 0
                ? `Você atende ${resumo.join(" e ")}.`
                : `Nada marcado: você atende o ${estado} inteiro. Toque abaixo para escolher só onde roda.`}
            </span>
          </p>

          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {temManaus && (
              <details className="group" open>
                <Linha titulo="Manaus" contagem={`${nBairros} de ${BAIRROS_MANAUS.length}`} destaque={nBairros > 0} />
                <div className="border-t border-line bg-lm-cinza/50">
                  <div className="px-3.5 pt-3">
                    <Chip
                      ativo={nBairros === BAIRROS_MANAUS.length}
                      onClick={() => alternar(bairros, setBairros, BAIRROS_MANAUS)}
                    >
                      Manaus inteira
                    </Chip>
                  </div>
                  <div className="mt-3 divide-y divide-line border-t border-line bg-surface">
                    {ZONAS_MANAUS.map((z) => {
                      const n = z.bairros.filter((b) => bairros.has(b)).length;
                      return (
                        <details key={z.nome} name="zona-manaus" className="group/zona">
                          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 py-1 pr-3.5 pl-6 select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lm-azul [&::-webkit-details-marker]:hidden">
                            <span className="min-w-0 flex-1 truncate text-sm text-ink">{z.nome}</span>
                            <span className={`num text-xs ${n > 0 ? "font-semibold text-lm-azul" : "text-muted"}`}>
                              {n} de {z.bairros.length}
                            </span>
                            <IconChevron className="size-4 shrink-0 text-muted transition-transform duration-150 group-open/zona:rotate-90" />
                          </summary>
                          <div className="flex flex-wrap gap-2 px-3.5 pt-1 pb-4 pl-6">
                            <Chip ativo={n === z.bairros.length} onClick={() => alternar(bairros, setBairros, z.bairros)}>
                              Zona inteira
                            </Chip>
                            {z.bairros.map((b) => (
                              <Chip key={b} ativo={bairros.has(b)} onClick={() => alternar(bairros, setBairros, [b])}>
                                {b}
                              </Chip>
                            ))}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              </details>
            )}

            <details className="group" open={!temManaus}>
              <Linha
                titulo={temManaus ? "Outras cidades do Amazonas" : `Cidades do ${estado}`}
                contagem={`${cidadesDoEstado.length} de ${outras.length}`}
                destaque={cidadesDoEstado.length > 0}
              />
              <div className="space-y-3 border-t border-line px-3.5 pt-3 pb-4">
                <label className="relative block">
                  <span className="sr-only">Buscar cidade</span>
                  <IconBusca className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                  <input
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.currentTarget.value)}
                    placeholder="Buscar cidade"
                    className={`${campo} pl-9`}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {visiveis.map((m) => (
                    <Chip key={m.ibge} ativo={cidades.has(m.ibge)} onClick={() => alternar(cidades, setCidades, [m.ibge])}>
                      {m.nome}
                    </Chip>
                  ))}
                  {visiveis.length === 0 && <p className="text-sm text-muted">Nenhuma cidade com esse nome.</p>}
                </div>
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  );
}
