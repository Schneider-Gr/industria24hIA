import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { PageTitle, SemLoja } from "@/components/seller/states";
import { EmptyState, Table } from "@/components/admin/ui";
import { UploadTabelaFrete } from "@/components/admin/UploadTransportadoras";
import { FormTransportadora } from "@/components/seller/transportadoras/FormTransportadora";
import { AtivarGlobal } from "@/components/seller/transportadoras/AtivarGlobal";
import { carregarPais } from "@/lib/transportadoras/arvore";
import { calcularPendencias } from "@/lib/transportadoras/pendencias";
import {
  salvarTransportadoraPropria,
  alternarTransportadoraPropria,
  previsualizarTabelaSeller,
  confirmarTabelaSeller,
  ativarGlobal,
  desativarGlobal,
} from "./actions";

export const dynamic = "force-dynamic";

// Módulo de transportadoras para grandes volumes (spec
// openspec/changes/transportadoras-grandes-volumes). O freteiro pequeno é o
// afiliado logístico (PRD 054), em /seller/parceiro-logistica.
export default async function SellerTransportadorasPage() {
  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const [{ data: proprias }, { data: globais }, { data: ativacoes }, { data: produtos }] = await Promise.all([
    supabase
      .from("transportadoras")
      .select("id, nome, ativo, desativada_por_admin, motivo_desativacao, revisar_categorias, tabela_atualizada_em")
      .eq("loja_id", loja.id)
      .order("nome"),
    supabase
      .from("transportadoras")
      .select("id, nome, encerra_em, tabela_atualizada_em, peso_max")
      .is("loja_id", null)
      .eq("ativo", true)
      .not("fonte", "in", "(uber_direct,mercado_envios)")
      .order("nome"),
    supabase.from("loja_transportadoras").select("transportadora_id, codigo_cliente, ativo").eq("loja_id", loja.id),
    supabase
      .from("produtos")
      .select("id, nome, taxonomia_no_id, peso, altura, largura, comprimento, cep_produto")
      .eq("loja_id", loja.id)
      .eq("status_produto", "Aprovado"),
  ]);

  const globaisValidas = (globais ?? []).filter((g) => !g.encerra_em || g.encerra_em > hoje);
  const idsTodas = [...(proprias ?? []).map((t) => t.id), ...globaisValidas.map((g) => g.id)];
  const [{ data: faixas }, { data: nos }] = await Promise.all([
    idsTodas.length
      ? supabase.from("transportadora_faixas_frete").select("transportadora_id").eq("ativo", true).in("transportadora_id", idsTodas)
      : Promise.resolve({ data: [] as { transportadora_id: string }[] }),
    idsTodas.length
      ? supabase.from("transportadora_nos").select("transportadora_id, taxonomia_no_id").in("transportadora_id", idsTodas)
      : Promise.resolve({ data: [] as { transportadora_id: string; taxonomia_no_id: string }[] }),
  ]);

  const faixasPor = new Map<string, number>();
  for (const f of faixas ?? []) faixasPor.set(f.transportadora_id, (faixasPor.get(f.transportadora_id) ?? 0) + 1);
  const nosPor = new Map<string, Set<string>>();
  for (const n of nos ?? []) {
    const s = nosPor.get(n.transportadora_id) ?? new Set<string>();
    s.add(n.taxonomia_no_id);
    nosPor.set(n.transportadora_id, s);
  }
  const ativacaoPor = new Map((ativacoes ?? []).map((a) => [a.transportadora_id, a]));

  const pais = await carregarPais(supabase, [
    ...(produtos ?? []).map((p) => p.taxonomia_no_id).filter((x): x is string => !!x),
    ...(nos ?? []).map((n) => n.taxonomia_no_id),
  ]);

  const pend = calcularPendencias({
    transportadoras: [
      ...(proprias ?? []).map((t) => ({
        id: t.id,
        nome: t.nome,
        ativo: t.ativo,
        faixasAtivas: faixasPor.get(t.id) ?? 0,
        nos: nosPor.get(t.id) ?? new Set<string>(),
        revisarCategorias: t.revisar_categorias,
        propria: true,
      })),
      ...globaisValidas.map((g) => ({
        id: g.id,
        nome: g.nome,
        ativo: ativacaoPor.get(g.id)?.ativo === true,
        faixasAtivas: faixasPor.get(g.id) ?? 0,
        nos: nosPor.get(g.id) ?? new Set<string>(),
        revisarCategorias: false,
        propria: false,
      })),
    ],
    produtos: (produtos ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      taxonomiaNoId: p.taxonomia_no_id,
      peso: p.peso,
      altura: p.altura,
      largura: p.largura,
      comprimento: p.comprimento,
      cepProduto: p.cep_produto,
    })),
    cepLoja: loja.cep,
    pais,
  });

  const paraUpload = (proprias ?? []).filter((t) => !t.desativada_por_admin);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Transportadoras"
        subtitle="Frete por tabela para cargas maiores. Para entregas locais de moto, carro ou caminhão, use o parceiro de logística."
      />

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold">O que falta para o frete funcionar</h2>
        {pend.total === 0 ? (
          <p className="text-sm text-muted">Tudo certo: o frete por transportadora da sua loja está pronto.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {pend.semFaixa.map((t) => (
              <li key={`sf-${t.id}`}>
                <Link href={`/seller/transportadoras/${t.id}`} className="font-medium text-roxo-800 hover:underline">
                  {t.nome}
                </Link>
                : sem tabela, não aparece no checkout.
              </li>
            ))}
            {pend.revisarCategorias.map((t) => (
              <li key={`rc-${t.id}`}>
                <Link href={`/seller/transportadoras/${t.id}`} className="font-medium text-roxo-800 hover:underline">
                  {t.nome}
                </Link>
                : uma categoria dela foi removida da árvore. Revise as categorias.
              </li>
            ))}
            <ListaProdutos
              titulo="Sem peso ou medidas (vão para Entrega a combinar)"
              itens={pend.semMedidas}
            />
            <ListaProdutos titulo="Nenhuma transportadora ativa leva estes produtos" itens={pend.semTransportadora} />
            <ListaProdutos
              titulo="Sem CEP de origem (nem no produto nem na loja): não calculam frete"
              itens={pend.semCepOrigem}
            />
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Suas transportadoras</h2>
        {(proprias ?? []).length === 0 ? (
          <EmptyState>Nenhuma transportadora cadastrada. Cadastre abaixo.</EmptyState>
        ) : (
          <Table headers={["Nome", "Faixas ativas", "Status", "", ""]}>
            {(proprias ?? []).map((t) => (
              <tr key={t.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-[9px]">
                  <Link href={`/seller/transportadoras/${t.id}`} className="text-roxo-800 hover:underline">
                    {t.nome}
                  </Link>
                </td>
                <td className="px-4 py-[9px] text-sm">{faixasPor.get(t.id) ?? 0}</td>
                <td className="px-4 py-[9px] text-sm">
                  {t.desativada_por_admin ? (
                    <span className="text-red-600">Desativada pelo admin: {t.motivo_desativacao ?? "sem motivo informado"}</span>
                  ) : t.ativo ? (
                    "Ativa"
                  ) : (
                    "Inativa"
                  )}
                </td>
                <td className="px-4 py-[9px] text-right">
                  {!t.desativada_por_admin && (
                    <form action={alternarTransportadoraPropria} className="inline">
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="ativo" value={String(t.ativo)} />
                      <button type="submit" className="rounded border border-line px-2 py-1 text-xs hover:bg-surface">
                        {t.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-4 py-[9px] text-right">
                  <Link href={`/seller/transportadoras/${t.id}`} className="text-xs text-roxo-800 hover:underline">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Cadastrar transportadora</h2>
        <FormTransportadora action={salvarTransportadoraPropria} rotuloBotao="Cadastrar" />
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Subir tabela de frete</h2>
        <UploadTabelaFrete
          transportadoras={paraUpload.map((t) => ({ id: t.id, nome: t.nome }))}
          pravisualizarAction={previsualizarTabelaSeller}
          confirmarAction={confirmarTabelaSeller}
        />
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold">Transportadoras negociadas pela Indústria 24h</h2>
        <p className="mb-2 text-xs text-muted">
          A plataforma negocia o preço; você contrata e paga a transportadora. Para ativar, informe o seu código de
          cliente nela.
        </p>
        {globaisValidas.length === 0 ? (
          <EmptyState>Nenhuma transportadora negociada disponível no momento.</EmptyState>
        ) : (
          <Table headers={["Nome", "Faixas", "Na sua loja", ""]}>
            {globaisValidas.map((g) => {
              const a = ativacaoPor.get(g.id);
              return (
                <tr key={g.id} className="text-ink dark:text-ink-2">
                  <td className="px-4 py-[9px]">
                    {g.nome}
                    {g.encerra_em && (
                      <span className="ml-2 text-xs text-amber-700">encerra em {g.encerra_em.split("-").reverse().join("/")}</span>
                    )}
                    {g.tabela_atualizada_em && (
                      <span className="block text-[11px] text-muted">
                        tabela atualizada em {new Date(g.tabela_atualizada_em).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-[9px] text-sm">{faixasPor.get(g.id) ?? 0}</td>
                  <td className="px-4 py-[9px] text-sm">
                    {a?.ativo ? `Ativa (código ${a.codigo_cliente})` : "Desativada"}
                  </td>
                  <td className="px-4 py-[9px]">
                    {a?.ativo ? (
                      <form action={desativarGlobal}>
                        <input type="hidden" name="transportadora_id" value={g.id} />
                        <button type="submit" className="rounded border border-line px-2 py-1 text-xs hover:bg-surface">
                          Desativar
                        </button>
                      </form>
                    ) : (
                      <AtivarGlobal transportadoraId={g.id} codigoAtual={a?.codigo_cliente} action={ativarGlobal} />
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </section>
    </div>
  );
}

function ListaProdutos({ titulo, itens }: { titulo: string; itens: { id: string; nome: string }[] }) {
  if (itens.length === 0) return null;
  return (
    <li>
      <span className="font-medium">{titulo}</span> ({itens.length}):{" "}
      {itens.slice(0, 8).map((p, i) => (
        <span key={p.id}>
          {i > 0 && ", "}
          <Link href={`/seller/produtos?q=${encodeURIComponent(p.nome)}`} className="text-roxo-800 hover:underline">
            {p.nome}
          </Link>
        </span>
      ))}
      {itens.length > 8 && ` e mais ${itens.length - 8}`}
    </li>
  );
}
