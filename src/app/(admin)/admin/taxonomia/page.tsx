import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { PADRAO_PCT } from "@/lib/comissao/percentual";
import { verPrevia, confirmarImportacao, salvarComissaoNo } from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "rounded border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-aco-600 dark:border-line dark:bg-surface";
const btnCls =
  "rounded bg-sinal px-3 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro";
const btnSecCls =
  "rounded border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-aco-100 dark:border-line dark:text-ink dark:hover:bg-aco-900";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type No = {
  id: string;
  nome: string;
  apelido: string | null;
  caminho: string;
  nivel: number;
  origem: string;
  obsoleto: boolean;
  comissao_pct: number | null;
  parent_id: string | null;
};

/** Painel de prévia. Não grava nada: só existe quando a action de prévia
 * devolveu números na query string (PRD 041 US01). */
function Previa({ p }: { p: Record<string, string> }) {
  const alteradas = Number(p.alteradas ?? 0);
  const bloqueado = alteradas > 0;
  return (
    <div className="mb-6 rounded-lg border border-line bg-surface p-4 dark:border-line dark:bg-surface">
      <h3 className="font-semibold text-ink dark:text-ink">Prévia da importação</h3>
      <p className="mt-1 text-xs text-ink-fraco dark:text-ink-fraco">
        Versão do arquivo: {p.versao}. Nada foi gravado ainda.
      </p>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex justify-between border-b border-line py-1">
          <dt>Nós no arquivo</dt>
          <dd className="font-semibold">{p.linhas}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-1">
          <dt>Novos</dt>
          <dd className="font-semibold">{p.novos}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-1">
          <dt>Já existem, ficam como estão</dt>
          <dd className="font-semibold">{p.existentes}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-1">
          <dt>Ausentes na versão nova</dt>
          <dd className="font-semibold">{p.ausentes}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-1">
          <dt>Nós criados por você, preservados</dt>
          <dd className="font-semibold">{p.proprios}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-1">
          <dt>Comissões configuradas, preservadas</dt>
          <dd className="font-semibold">{p.comissoes}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-1">
          <dt>Produtos afetados</dt>
          <dd className="font-semibold">{p.afetados}</dd>
        </div>
        <div className="flex justify-between border-b border-line py-1">
          <dt>Comissão efetiva alterada</dt>
          <dd className={bloqueado ? "font-semibold text-erro" : "font-semibold"}>
            {alteradas === 0 ? "nenhuma" : alteradas}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-ink-fraco dark:text-ink-fraco">
        Todo nó novo nasce sem percentual e herda {fmt(PADRAO_PCT)}%. Nenhum preço
        muda com esta importação.
      </p>

      {bloqueado ? (
        <p className="mt-3 rounded border border-erro px-3 py-2 text-sm text-erro">
          Importação bloqueada: esta operação mudaria a comissão efetiva de{" "}
          {alteradas} produto(s). Revise antes de prosseguir.
        </p>
      ) : (
        <form action={confirmarImportacao} className="mt-4 flex gap-2">
          <button type="submit" className={btnCls}>
            Importar {p.novos} nós
          </button>
          <Link href="/admin/taxonomia" className={btnSecCls}>
            Cancelar
          </Link>
        </form>
      )}
    </div>
  );
}

function CampoComissao({ no, efetivo }: { no: No; efetivo: number }) {
  const proprio = no.comissao_pct;
  return (
    <form action={salvarComissaoNo} className="flex items-center gap-2">
      <input type="hidden" name="id" value={no.id} />
      <label className="sr-only" htmlFor={`pct-${no.id}`}>
        Comissão da plataforma
      </label>
      <input
        id={`pct-${no.id}`}
        name="comissao_pct"
        inputMode="decimal"
        defaultValue={proprio === null ? "" : fmt(proprio)}
        placeholder={fmt(efetivo)}
        className={`${inputCls} w-20 text-right`}
      />
      <span className="text-sm text-ink-fraco dark:text-ink-fraco">%</span>
      <button type="submit" className="text-xs font-semibold text-ink hover:underline">
        Salvar
      </button>
      <span className="text-xs text-ink-fraco dark:text-ink-fraco">
        {proprio === null ? `herda ${fmt(efetivo)}%` : `próprio`}
      </span>
    </form>
  );
}

export default async function TaxonomiaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const pai = sp.pai ?? "";

  const supabase = await createClient();

  // Sem busca e sem pai: raízes. Com pai: filhos dele. Com busca: resultados em
  // qualquer profundidade, exibindo o caminho inteiro.
  let query = supabase
    .from("taxonomia_nos")
    .select("id, nome, apelido, caminho, nivel, origem, obsoleto, comissao_pct, parent_id")
    .order("caminho")
    .limit(200);

  if (q) query = query.ilike("nome", `%${q}%`);
  else if (pai) query = query.eq("parent_id", pai);
  else query = query.eq("nivel", 1);

  const [{ data: nos, error }, { count: total }, { data: trilha }, { data: herdadoPai }] =
    await Promise.all([
      query,
      supabase.from("taxonomia_nos").select("id", { count: "exact", head: true }),
      pai
        ? supabase.from("taxonomia_nos").select("id, caminho").eq("id", pai).single()
        : Promise.resolve({ data: null }),
      pai && !q
        ? supabase.rpc("taxonomia_comissao_pct", { p_no_id: pai })
        : Promise.resolve({ data: null }),
    ]);

  if (error) {
    return (
      <ErrorState title="Falha ao carregar a taxonomia" detail={error.message} />
    );
  }

  const lista = (nos ?? []) as No[];
  const temPrevia = Boolean(sp.linhas);
  const importou = sp.ok === "1";

  // Percentual efetivo exibido: o próprio, senão o efetivo do pai listado
  // (taxonomia_comissao_pct). Na busca os pais variam; ali cai no padrão.
  const herdado = herdadoPai == null ? PADRAO_PCT : Number(herdadoPai);
  const efetivoDe = (n: No) => n.comissao_pct ?? herdado;

  return (
    <div>
      <PageHeader
        title="Taxonomia"
        subtitle="Árvore de categorias importada e comissão da plataforma por nó"
        count={total ?? 0}
      />

      {importou && (
        <p className="mb-4 rounded border border-line bg-surface px-3 py-2 text-sm text-ink dark:border-line dark:bg-surface dark:text-ink">
          Importação concluída: {sp.novos} nós novos, {sp.obsoletos} marcados como
          obsoletos. Nenhuma comissão foi alterada.
        </p>
      )}

      <p className="mb-6 max-w-2xl text-sm text-ink-fraco dark:text-ink-fraco">
        Esta árvore é o catálogo de referência do marketplace e aceita
        profundidade livre. O percentual de um nó vale para todos os descendentes
        até alguém definir outro mais abaixo. Campo vazio herda; zero é comissão
        nula deliberada, e é diferente de vazio. Sem nenhum percentual no
        caminho, vale o padrão de {fmt(PADRAO_PCT)}%.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <form action={verPrevia}>
          <button type="submit" className={btnCls}>
            Importar taxonomia
          </button>
        </form>
        <Link href="/admin/categorias" className={btnSecCls}>
          Categorias atuais
        </Link>
        <form className="ml-auto flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar nó em qualquer nível"
            className={inputCls}
          />
          <button type="submit" className={btnSecCls}>
            Buscar
          </button>
        </form>
      </div>

      {temPrevia && <Previa p={sp as Record<string, string>} />}

      {pai && !q && (
        <p className="mb-3 text-sm">
          <Link href="/admin/taxonomia" className="text-sinal hover:underline">
            ← Voltar às raízes
          </Link>
          {trilha && "caminho" in trilha && trilha.caminho ? (
            <span className="ml-3 text-ink-fraco dark:text-ink-fraco">
              {trilha.caminho}
            </span>
          ) : null}
        </p>
      )}

      {lista.length === 0 ? (
        <EmptyState>
          {total === 0
            ? "Nenhum nó importado ainda. Use o botão Importar taxonomia."
            : "Nenhum nó encontrado."}
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {lista.map((n) => (
            <li
              key={n.id}
              className="flex flex-wrap items-center gap-3 rounded border border-line bg-surface px-3 py-2 dark:border-line dark:bg-surface"
            >
              <Link
                href={`/admin/taxonomia?pai=${n.id}`}
                className="min-w-48 text-sm font-medium text-sinal hover:underline"
              >
                {n.apelido ?? n.nome} ›
              </Link>
              {q && (
                <span className="text-xs text-ink-fraco dark:text-ink-fraco">
                  {n.caminho}
                </span>
              )}
              {n.obsoleto && (
                <span className="text-xs font-semibold text-erro">descontinuado</span>
              )}
              {n.origem === "local" && (
                <span className="text-xs text-ink-fraco dark:text-ink-fraco">
                  criado por você
                </span>
              )}
              <div className="ml-auto">
                <CampoComissao no={n} efetivo={efetivoDe(n)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
