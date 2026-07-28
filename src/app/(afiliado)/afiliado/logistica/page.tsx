import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { formatBRL } from "@/components/seller/format";
import { PrecisaLogin, VazioBox, PageTitle } from "@/components/seller/states";
import { Table, StatusBadge, EmptyState } from "@/components/admin/ui";
import {
  atualizarEntregaLogistica,
  atualizarStatusRotaAfiliado,
  aceitarCorridaAfiliado,
  atualizarStatusCorridaAfiliado,
} from "./actions";

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
  data: string | null;
  status_pedido: string | null;
};

// Pedido que ainda demanda logística (exclui cancelado/estornado). Sem isto,
// os 251 pedidos históricos migrados abririam o painel com centenas de
// "pendentes" falsos e o afiliado despacharia mercadoria de pedido cancelado.
const STATUS_FORA = ["Cancelado", "Estornado", "Recusado"];

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
          <a href="/afiliado/solicitar" className="text-sinal-escuro font-semibold underline">
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
    (lojas ?? [])
      .filter((l): l is { id: string; nome: string } => !!l.id && !!l.nome)
      .map((l) => [l.id, l.nome])
  );

  // Views operacionais (0014): só colunas de logística, sem financeiro/Asaas/PII.
  const { data: pedidos, error: errPedidos } = await supabase
    .from("logistica_pedidos")
    .select("id, id_venda, loja_id, data, status_pedido")
    .in("loja_id", lojaIds)
    .not("status_pedido", "in", `(${STATUS_FORA.join(",")})`);

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
      .from("logistica_itens")
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0042 fora dos tipos gerados
  const { data: rotasData } = await (supabase as any)
    .from("rotas")
    .select("id, origem_cep, destino_cep, frete_calculado, status")
    .eq("afiliado_id", user.id)
    .in("status", ["Atribuida", "EmTransito"])
    .order("criado_em", { ascending: true });
  const rotas = (rotasData ?? []) as {
    id: string;
    origem_cep: string | null;
    destino_cep: string | null;
    frete_calculado: number | null;
    status: string;
  }[];
  const proximoStatusRota: Record<string, { valor: string; rotulo: string }> = {
    Atribuida: { valor: "EmTransito", rotulo: "Iniciar trânsito" },
    EmTransito: { valor: "Entregue", rotulo: "Confirmar entrega" },
  };

  // Corridas do despacho automático (0043/0044): exclusivas pra este afiliado
  // enquanto dentro da janela, ou já aceitas por ele.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0039/0043 fora dos tipos gerados
  const { data: corridasData } = await (supabase as any)
    .from("corridas")
    .select("id, origem_endereco, destino_endereco, preco_final, valor_parceiro, status, exclusividade_fim, distancia_m, duracao_s, link_mapa")
    .eq("afiliado_exclusivo_id", user.id)
    .in("status", ["Publicada", "Aceita", "Coletada", "EmTransito"])
    .order("criado_em", { ascending: true });
  const corridasAutomaticas = (corridasData ?? []) as {
    id: string;
    origem_endereco: string;
    destino_endereco: string;
    preco_final: number | null;
    valor_parceiro: number | null;
    status: string;
    exclusividade_fim: string | null;
    distancia_m: number | null;
    duracao_s: number | null;
    link_mapa: string | null;
  }[];
  const proximoStatusCorrida: Record<string, { valor: string; rotulo: string }> = {
    Aceita: { valor: "Coletada", rotulo: "Confirmar coleta" },
    Coletada: { valor: "EmTransito", rotulo: "Iniciar trânsito" },
    EmTransito: { valor: "Entregue", rotulo: "Confirmar entrega (foto)" },
  };

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
                      className="bg-sinal text-white hover:bg-sinal-escuro rounded font-semibold px-3 py-1 text-sm"
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

      <div>
        <h2 className="text-lg font-bold mb-3">
          Corridas automáticas ({corridasAutomaticas.length})
        </h2>
        {corridasAutomaticas.length === 0 ? (
          <EmptyState>Nenhuma corrida despachada automaticamente pra você no momento.</EmptyState>
        ) : (
          <div className="space-y-3">
            {corridasAutomaticas.map((c) => {
              const exclusiva = c.status === "Publicada" && c.exclusividade_fim && new Date(c.exclusividade_fim) > new Date();
              const prox = proximoStatusCorrida[c.status];
              return (
                <div key={c.id} className="rounded border border-borda bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {c.origem_endereco} → {c.destino_endereco}
                    </p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {c.valor_parceiro != null ? (
                      <>Você ganha: <span className="num font-semibold">{formatBRL(c.valor_parceiro)}</span>{" "}
                        (frete {formatBRL(c.preco_final ?? 0)})</>
                    ) : (
                      <>Frete: <span className="num font-semibold">{formatBRL(c.preco_final ?? 0)}</span></>
                    )}
                    {c.distancia_m != null && (
                      <>
                        {" · "}
                        <span className="num">{(c.distancia_m / 1000).toFixed(1)} km</span>
                        {c.duracao_s != null && <> · ~<span className="num">{Math.round(c.duracao_s / 60)} min</span></>}
                      </>
                    )}
                    {exclusiva && " · exclusiva pra você por mais alguns minutos"}
                  </p>
                  {c.link_mapa && (
                    <a href={c.link_mapa} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-sinal-escuro underline">
                      Ver rota no mapa
                    </a>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {c.status === "Publicada" && (
                      <form action={aceitarCorridaAfiliado}>
                        <input type="hidden" name="corrida_id" value={c.id} />
                        <button className="rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro">
                          Aceitar corrida
                        </button>
                      </form>
                    )}
                    {prox && (
                      <form action={atualizarStatusCorridaAfiliado} className="flex items-center gap-2">
                        <input type="hidden" name="corrida_id" value={c.id} />
                        <input type="hidden" name="status" value={prox.valor} />
                        {prox.valor === "Entregue" && (
                          <input type="file" name="foto" accept="image/*" required className="text-xs" />
                        )}
                        <button className="rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro">
                          {prox.rotulo}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">
          Rotas atribuídas a mim ({rotas.length})
        </h2>
        {rotas.length === 0 ? (
          <EmptyState>Nenhuma rota de pedido atribuída a você no momento.</EmptyState>
        ) : (
          <div className="space-y-3">
            {rotas.map((r) => {
              const prox = proximoStatusRota[r.status];
              return (
                <div key={r.id} className="rounded border border-borda bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {r.origem_cep} → {r.destino_cep}
                    </p>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.frete_calculado != null && (
                    <p className="mt-1 text-sm text-muted">
                      Frete: <span className="num font-semibold">{formatBRL(r.frete_calculado)}</span>
                    </p>
                  )}
                  {prox && (
                    <form action={atualizarStatusRotaAfiliado} className="mt-3">
                      <input type="hidden" name="rota_id" value={r.id} />
                      <input type="hidden" name="status" value={prox.valor} />
                      <button className="rounded bg-sinal px-4 py-1.5 text-sm font-semibold text-white hover:bg-sinal-escuro">
                        {prox.rotulo}
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
