import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import { PrecisaLogin, VazioBox, PageTitle } from "@/components/seller/states";
import { Table, StatusBadge, EmptyState } from "@/components/admin/ui";
import { atualizarEntregaLogistica } from "./actions";

type Afiliacao = {
  id: string;
  loja_id: string;
  status: "Pendente" | "Aprovada" | "Suspensa";
  tipo: string;
};

type Pedido = {
  id: string;
  id_venda: string | null;
  loja_id: string;
  data: string;
};

type LinhaItem = {
  id: string;
  pedido_id: string;
  produto_nome: string;
  quantidade: number;
  valor: number;
};

type Entrega = {
  linha_item_id: string;
  status: "Pendente" | "Enviado" | "Entregue";
  rastreio: string | null;
};

export default async function AfiliadoLogisticaPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const supabase = await createClient();

  const { data: afiliacoes, error: errAfiliacoes } = await supabase
    .from("afiliacoes")
    .select("id, loja_id, status, tipo")
    .eq("afiliado_id", user.id)
    .eq("tipo", "logistica");

  if (errAfiliacoes) {
    return (
      <ErrorState
        title="Não foi possível carregar suas afiliações"
        detail={errAfiliacoes.message}
      />
    );
  }

  const lista = (afiliacoes ?? []) as Afiliacao[];

  if (lista.length === 0) {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Logística"
          subtitle="Entregas das lojas onde você é afiliado logístico"
        />
        <VazioBox>
          Você ainda não é afiliado logístico de nenhuma loja. Para
          acompanhar entregas por aqui, solicite uma afiliação de logística em{" "}
          <a href="/afiliado/solicitar" className="text-laranja font-semibold underline">
            /afiliado/solicitar
          </a>
          .
        </VazioBox>
      </div>
    );
  }

  const aprovadas = lista.filter((a) => a.status === "Aprovada");

  if (aprovadas.length === 0) {
    const statusUnicos = Array.from(new Set(lista.map((a) => a.status)));
    return (
      <div className="space-y-6">
        <PageTitle
          title="Logística"
          subtitle="Entregas das lojas onde você é afiliado logístico"
        />
        <VazioBox>
          Sua afiliação de logística ainda não está aprovada. Status atual:{" "}
          <strong>{statusUnicos.join(", ")}</strong>. Assim que for aprovada,
          as entregas das lojas aparecerão aqui.
        </VazioBox>
      </div>
    );
  }

  const lojaIds = Array.from(new Set(aprovadas.map((a) => a.loja_id)));

  const { data: lojas, error: errLojas } = await supabase
    .from("lojas_vitrine") // view pública sem PII (0012); leitura direta de lojas caiu
    .select("id, nome")
    .in("id", lojaIds);

  if (errLojas) {
    return (
      <ErrorState
        title="Não foi possível carregar as lojas afiliadas"
        detail={errLojas.message}
      />
    );
  }

  const nomeLoja = new Map<string, string>(
    (lojas ?? []).map((l: { id: string; nome: string }) => [l.id, l.nome])
  );

  const { data: pedidos, error: errPedidos } = await supabase
    .from("pedidos")
    .select("id, id_venda, loja_id, data")
    .in("loja_id", lojaIds);

  if (errPedidos) {
    return (
      <ErrorState
        title="Não foi possível carregar os pedidos"
        detail={errPedidos.message}
      />
    );
  }

  const listaPedidos = (pedidos ?? []) as Pedido[];
  const pedidoIds = listaPedidos.map((p) => p.id);

  let itens: LinhaItem[] = [];
  if (pedidoIds.length > 0) {
    const { data: linhaItens, error: errItens } = await supabase
      .from("linha_itens")
      .select("id, pedido_id, produto_nome, quantidade, valor")
      .in("pedido_id", pedidoIds);

    if (errItens) {
      return (
        <ErrorState
          title="Não foi possível carregar os itens dos pedidos"
          detail={errItens.message}
        />
      );
    }
    itens = (linhaItens ?? []) as LinhaItem[];
  }

  const itemIds = itens.map((i) => i.id);

  let entregas: Entrega[] = [];
  if (itemIds.length > 0) {
    const { data: entregasData, error: errEntregas } = await supabase
      .from("entregas")
      .select("linha_item_id, status, rastreio")
      .in("linha_item_id", itemIds);

    if (errEntregas) {
      return (
        <ErrorState
          title="Não foi possível carregar as entregas"
          detail={errEntregas.message}
        />
      );
    }
    entregas = (entregasData ?? []) as Entrega[];
  }

  const entregaPorItem = new Map<string, Entrega>(
    entregas.map((e) => [e.linha_item_id, e])
  );
  const pedidoPorId = new Map<string, Pedido>(
    listaPedidos.map((p) => [p.id, p])
  );

  const linhas = itens.map((item) => {
    const entrega = entregaPorItem.get(item.id);
    const pedido = pedidoPorId.get(item.pedido_id);
    const status = entrega?.status ?? "Pendente";
    return { item, entrega, pedido, status };
  });

  const pendentes = linhas.filter((l) => l.status === "Pendente").length;
  const enviados = linhas.filter((l) => l.status === "Enviado").length;
  const entregues = linhas.filter((l) => l.status === "Entregue").length;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Logística"
        subtitle="Entregas das lojas onde você é afiliado logístico"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded border border-borda bg-white p-4">
          <p className="text-xs uppercase tracking-[.12em] text-muted">
            Pendentes
          </p>
          <p className="text-2xl font-bold num">{pendentes}</p>
        </div>
        <div className="rounded border border-borda bg-white p-4">
          <p className="text-xs uppercase tracking-[.12em] text-muted">
            Enviados
          </p>
          <p className="text-2xl font-bold num">{enviados}</p>
        </div>
        <div className="rounded border border-borda bg-white p-4">
          <p className="text-xs uppercase tracking-[.12em] text-muted">
            Entregues
          </p>
          <p className="text-2xl font-bold num">{entregues}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">
          Entregas sob minha responsabilidade
        </h2>

        {linhas.length === 0 ? (
          <EmptyState>Nenhum item de entrega encontrado por aqui.</EmptyState>
        ) : (
          <Table
            headers={[
              "Produto",
              "Qtd",
              "Valor",
              "Pedido",
              "Loja",
              "Status atual",
              "Atualizar",
            ]}
          >
            {linhas.map(({ item, entrega, pedido, status }) => (
              <tr key={item.id} className="border-b border-borda">
                <td className="py-[9px] px-3">{item.produto_nome}</td>
                <td className="py-[9px] px-3 num text-right">
                  {item.quantidade}
                </td>
                <td className="py-[9px] px-3 num text-right font-semibold">
                  {formatBRL(item.valor)}
                </td>
                <td className="py-[9px] px-3">
                  {pedido?.id_venda ?? pedido?.id.slice(0, 8) ?? "—"}
                </td>
                <td className="py-[9px] px-3">
                  {pedido ? nomeLoja.get(pedido.loja_id) ?? "—" : "—"}
                </td>
                <td className="py-[9px] px-3">
                  <StatusBadge status={status} />
                </td>
                <td className="py-[9px] px-3">
                  <form
                    action={atualizarEntregaLogistica}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="linha_item_id" value={item.id} />
                    <select
                      name="status"
                      defaultValue={status}
                      className="border border-borda rounded px-2 py-1 text-sm"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Enviado">Enviado</option>
                      <option value="Entregue">Entregue</option>
                    </select>
                    <input
                      type="text"
                      name="rastreio"
                      defaultValue={entrega?.rastreio ?? ""}
                      placeholder="Código de rastreio"
                      className="border border-borda rounded px-2 py-1 text-sm w-40"
                    />
                    <button
                      type="submit"
                      className="bg-laranja text-white hover:bg-laranja-escuro rounded font-semibold px-3 py-1 text-sm"
                    >
                      Salvar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
