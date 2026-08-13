import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PrecisaLogin, PageTitle } from "@/components/seller/states";
import { Table, StatusBadge, EmptyState } from "@/components/admin/ui";
import { solicitarAfiliacao, solicitarAfiliacaoLoja } from "../actions";

function AvisoErro({ erro }: { erro?: string }) {
  if (!erro) return null;
  return (
    <p
      role="alert"
      className="mb-4 rounded-sm border border-red-700 bg-red-50 p-3 text-sm text-red-700"
    >
      {erro}
    </p>
  );
}

export default async function SolicitarAfiliacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const supabase = await createClient();

  // ---- Afiliar-se a uma loja ----
  const { data: lojasAtivasRaw, error: errLojasAtivas } = await supabase
    .from("lojas_vitrine") // view pública sem PII (0012); leitura direta de lojas caiu
    .select("id, nome, cidade, estado")
    .order("nome", { ascending: true });
  const lojasAtivas = (lojasAtivasRaw ?? []).filter(
    (l): l is { id: string; nome: string; cidade: string | null; estado: string | null } =>
      !!l.id && !!l.nome
  );

  if (errLojasAtivas) {
    return (
      <ErrorState
        title="Erro ao carregar lojas"
        detail={errLojasAtivas.message}
      />
    );
  }

  const { data: afiliacoesLoja, error: errAfiliacoesLoja } = await supabase
    .from("afiliacoes")
    .select("loja_id, status, tipo")
    .eq("afiliado_id", user.id)
    .not("loja_id", "is", null);

  if (errAfiliacoesLoja) {
    return (
      <ErrorState
        title="Erro ao carregar afiliações de loja"
        detail={errAfiliacoesLoja.message}
      />
    );
  }

  const afiliacaoLojaMap = new Map(
    (afiliacoesLoja ?? []).map((a) => [a.loja_id, a])
  );

  // ---- Produtos disponíveis para afiliação ----
  const { data: produtos, error } = await supabase
    .from("produtos")
    .select("id, nome, valor, loja_id, porcentagem_afiliado")
    .eq("permite_afiliacao", true)
    .order("nome", { ascending: true });

  if (error) {
    return (
      <ErrorState
        title="Erro ao carregar produtos"
        detail={error.message}
      />
    );
  }

  if (!produtos || produtos.length === 0) {
    return (
      <div className="p-6">
        <PageTitle
          title="Solicitar afiliação"
          subtitle="Afilie-se a lojas ou produtos"
        />

        <AvisoErro erro={erro} />

        <SecaoAfiliarLoja
          lojas={lojasAtivas ?? []}
          afiliacaoLojaMap={afiliacaoLojaMap}
        />

        <h2 className="font-display text-[19px] font-bold text-ink mt-8 mb-3">
          Produtos disponíveis
        </h2>
        <EmptyState>Nenhum produto disponível para afiliação no momento.</EmptyState>
      </div>
    );
  }

  const lojaIds = Array.from(new Set(produtos.map((p) => p.loja_id)));
  const produtoIds = produtos.map((p) => p.id);

  const { data: lojas, error: errLojas } = await supabase
    .from("lojas_vitrine") // view pública sem PII (0012)
    .select("id, nome")
    .in("id", lojaIds);

  if (errLojas) {
    return (
      <ErrorState
        title="Erro ao carregar lojas"
        detail={errLojas.message}
      />
    );
  }

  const lojaMap = new Map(
    (lojas ?? []).filter((l) => l.id && l.nome).map((l) => [l.id as string, l.nome as string])
  );

  const { data: afiliacoes, error: errAfiliacoes } = await supabase
    .from("afiliacoes")
    .select("produto_id, status")
    .eq("afiliado_id", user.id)
    .in("produto_id", produtoIds);

  if (errAfiliacoes) {
    return (
      <ErrorState
        title="Erro ao carregar afiliações"
        detail={errAfiliacoes.message}
      />
    );
  }

  const afiliacaoMap = new Map(
    (afiliacoes ?? []).map((a) => [a.produto_id, a.status])
  );

  return (
    <div className="p-6">
      <PageTitle
        title="Solicitar afiliação"
        subtitle="Afilie-se a lojas ou produtos"
      />

      <AvisoErro erro={erro} />

      <SecaoAfiliarLoja
        lojas={lojasAtivas ?? []}
        afiliacaoLojaMap={afiliacaoLojaMap}
      />

      <h2 className="font-display text-[19px] font-bold text-ink mt-8 mb-3">
        Produtos disponíveis
      </h2>

      <Table headers={["Produto", "Loja", "Comissão", "Ação"]}>
        {produtos.map((p) => {
          const status = afiliacaoMap.get(p.id);
          return (
            <tr key={p.id}>
              <td className="px-4 py-[9px]">{p.nome}</td>
              <td className="px-4 py-[9px]">
                {lojaMap.get(p.loja_id) ?? "—"}
              </td>
              <td className="px-4 py-[9px] text-right">
                <span className="num">{p.porcentagem_afiliado}%</span>
              </td>
              <td className="px-4 py-[9px] text-right">
                {status ? (
                  <StatusBadge status={status} />
                ) : (
                  <form action={solicitarAfiliacao} className="flex flex-col items-end gap-1.5">
                    <input type="hidden" name="produto_id" value={p.id} />
                    <input type="hidden" name="loja_id" value={p.loja_id} />
                    <label className="flex items-center gap-1.5 text-xs text-secundario">
                      <input type="checkbox" name="aceite_termos" required className="h-3.5 w-3.5" />
                      <span>
                        Li e aceito os{" "}
                        <a href="/termos/termos-afiliado-vendas" target="_blank" rel="noopener noreferrer" className="text-sinal-escuro underline">
                          Termos do Afiliado de Vendas
                        </a>
                      </span>
                    </label>
                    <button
                      type="submit"
                      className="bg-sinal text-white hover:bg-sinal-escuro rounded font-semibold px-3 py-1.5 text-sm"
                    >
                      Solicitar
                    </button>
                  </form>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

function SecaoAfiliarLoja({
  lojas,
  afiliacaoLojaMap,
}: {
  lojas: { id: string; nome: string; cidade: string | null; estado: string | null }[];
  afiliacaoLojaMap: Map<string, { loja_id: string; status: string; tipo: string }>;
}) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-[19px] font-bold text-ink mb-3">
        Afiliar-se a uma loja
      </h2>

      {lojas.length === 0 ? (
        <EmptyState>Nenhuma loja disponível para afiliação no momento.</EmptyState>
      ) : (
        <Table headers={["Loja", "Cidade/UF", "Tipo", "Ação"]}>
          {lojas.map((l) => {
            const afiliacao = afiliacaoLojaMap.get(l.id);
            const localizacao = [l.cidade, l.estado].filter(Boolean).join(" / ") || "—";
            return (
              <tr key={l.id}>
                <td className="px-4 py-[9px]">{l.nome}</td>
                <td className="px-4 py-[9px]">{localizacao}</td>
                <td className="px-4 py-[9px]">
                  {afiliacao ? (
                    <span className="text-sm text-secundario capitalize">
                      {afiliacao.tipo === "logistica" ? "Logística" : "Divulgação"}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-[9px] text-right">
                  {afiliacao ? (
                    <StatusBadge status={afiliacao.status} />
                  ) : (
                    <form
                      action={solicitarAfiliacaoLoja}
                      className="flex flex-col items-end gap-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <input type="hidden" name="loja_id" value={l.id} />
                        <select name="tipo" className="border border-borda rounded px-2 py-1.5 text-sm" defaultValue="vendas">
                          <option value="vendas">Divulgação/vendas</option>
                          <option value="logistica">Logística/entregas</option>
                        </select>
                        <button
                          type="submit"
                          className="bg-sinal text-white hover:bg-sinal-escuro rounded font-semibold px-3 py-1.5 text-sm"
                        >
                          Solicitar
                        </button>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-secundario">
                        <input type="checkbox" name="aceite_termos" required className="h-3.5 w-3.5" />
                        <span>
                          Li e aceito os Termos (
                          <a href="/termos/termos-afiliado-vendas" target="_blank" rel="noopener noreferrer" className="text-sinal-escuro underline">vendas</a>
                          {" / "}
                          <a href="/termos/termos-afiliado-logistica" target="_blank" rel="noopener noreferrer" className="text-sinal-escuro underline">logística</a>
                          )
                        </span>
                      </label>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
