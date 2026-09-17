import { Fragment } from "react";

import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { CentroForm } from "@/components/seller/CentroForm";
import { EnderecosCentro, type EnderecoArmazenagem } from "@/components/seller/EnderecosCentro";
import { formatData } from "@/components/seller/format";
import { excluirCentro } from "./actions";

export const dynamic = "force-dynamic";

function formatCep(cep: number | null) {
  if (cep == null) return "—";
  const s = String(cep).padStart(8, "0");
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

export default async function CentrosPage({
  searchParams,
}: {
  searchParams?: Promise<{ erro?: string; ok?: string }>;
}) {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const params = await searchParams;
  const erro = params?.erro;
  const ok = params?.ok;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("centros_distribuicao")
    .select("id, nome, localizacao, status, created_at, cep, tipo")
    .eq("loja_id", loja.id)
    .order("created_at", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar centros" detail={error.message} />;
  }

  const centros = data ?? [];

  // Endereços e saldos numa consulta só, para a tela não fazer uma por centro.
  // A RLS já restringe aos centros da loja e aos produtos do dono (0176).
  const { data: enderecosRaw } = centros.length
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas da 0176 fora dos tipos gerados
      await (supabase as any)
        .from("estoque_enderecos")
        .select(
          "id, centro_id, codigo, rua, predio, nivel, apartamento, bloqueado, motivo_bloqueio, estoque_saldos_endereco(quantidade)",
        )
        .in(
          "centro_id",
          centros.map((c) => c.id),
        )
        .order("codigo")
    : { data: [] };

  const porCentro = new Map<string, EnderecoArmazenagem[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas da 0176 fora dos tipos gerados
  for (const e of (enderecosRaw ?? []) as any[]) {
    const saldo = (e.estoque_saldos_endereco ?? []).reduce(
      (acc: number, s: { quantidade: number }) => acc + s.quantidade,
      0,
    );
    const lista = porCentro.get(e.centro_id) ?? [];
    lista.push({ ...e, saldo });
    porCentro.set(e.centro_id, lista);
  }

  return (
    <div>
      <PageTitle
        title="Centro de distribuição"
        subtitle="Cadastre os pontos de onde seus produtos são despachados e as posições onde a mercadoria fica guardada."
      />

      {ok && (
        <p className="mb-4 rounded border border-ok/40 bg-ok/10 px-4 py-2 text-sm text-ok">
          {ok}
        </p>
      )}
      {erro && (
        <p className="mb-4 rounded border border-erro/40 bg-erro/10 px-4 py-2 text-sm text-erro">
          {erro}
        </p>
      )}

      <div className="mb-8">
        <CentroForm />
      </div>

      {centros.length === 0 ? (
        <VazioBox>Nenhum centro de distribuição cadastrado.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Nome</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Localização</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">CEP</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Cadastro</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Status</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {centros.map((c) => (
                <Fragment key={c.id}>
                  <tr className="border-t border-line">
                    <td className="px-4 py-2 text-ink">
                      {c.nome}
                      {c.tipo === "industria" && (
                        <span className="ml-2 rounded bg-lm-azul/10 px-2 py-0.5 text-[11px] font-medium text-lm-azul">
                          CD Indústria
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-ink">{c.localizacao ?? "—"}</td>
                    <td className="px-4 py-2 text-ink">{formatCep(c.cep)}</td>
                    <td className="px-4 py-2 text-ink">{formatData(c.created_at)}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block rounded bg-ok/10 px-2 py-1 text-xs font-medium text-ok">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <form action={excluirCentro}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="rounded border border-line px-2 py-1 text-xs font-semibold text-erro hover:bg-erro/10"
                        >
                          Excluir
                        </button>
                      </form>
                    </td>
                  </tr>
                  <tr className="border-t border-line/60">
                    <td colSpan={6} className="bg-surface/40 px-4 py-3">
                      <EnderecosCentro
                        centroId={c.id}
                        enderecos={porCentro.get(c.id) ?? []}
                        obrigatorio={c.tipo === "industria"}
                      />
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
