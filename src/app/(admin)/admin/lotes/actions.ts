"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { linkRota, otimizarParadas } from "@/lib/geo";
import { montarParadas } from "@/lib/logistica-parceiro/rota-lote";
import { avisoNovaCorrida } from "@/lib/logistica-parceiro/aviso-corrida";
import { destinatariosDaCorrida, enviarPush } from "@/lib/push";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

// Monta o lote de consolidação (RPC 0074 + 0215, admin-only no banco): valida
// pedidos pagos/consolidados/mesma loja/mesma zona ou corredor e publica UMA
// corrida-manifesto com preço = soma dos fretes cobrados. Gate explícito
// aqui é defesa em profundidade além do admin-only da RPC.
export async function criarLote(formData: FormData): Promise<void> {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const pedidoIds = formData.getAll("pedido_id").map(String).filter(Boolean);
  if (pedidoIds.length < 2) throw new Error("Selecione ao menos 2 pedidos.");

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0074 fora dos tipos gerados
  const sb = supabase as any;
  const { data: loteId, error } = await sb.rpc("criar_lote_consolidacao", {
    p_pedido_ids: pedidoIds,
  });
  if (error) throw new Error(error.message);

  // PRD 060 US02: o lote já existe, na ordem de chegada dos pedidos. A rota
  // otimizada é um ganho por cima; qualquer falha aqui deixa o lote como está
  // e a tela avisa que a rota não foi otimizada.
  try {
    await otimizarRotaDoLote(sb, String(loteId));
  } catch (erro) {
    console.error("[lotes] rota do lote não otimizada:", erro);
  }

  // Push no app do entregador (0216), depois da rota: o aviso já sai com a
  // primeira parada da ordem otimizada.
  if (isServiceConfigured) {
    const { data: lote } = await sb
      .from("lotes_consolidacao")
      .select("corridas(id, destino_endereco, preco_final, valor_parceiro, distancia_m, afiliado_exclusivo_id)")
      .eq("id", loteId)
      .maybeSingle();
    const c = lote?.corridas as {
      id: string;
      destino_endereco: string;
      preco_final: number | null;
      valor_parceiro: number | null;
      distancia_m: number | null;
      afiliado_exclusivo_id: string | null;
    } | null;
    if (c) {
      const svc = createServiceClient();
      await enviarPush(
        svc,
        await destinatariosDaCorrida(svc, c.afiliado_exclusivo_id),
        avisoNovaCorrida({
          id: c.id,
          destino: c.destino_endereco,
          valor: c.valor_parceiro ?? c.preco_final,
          distanciaM: c.distancia_m,
          exclusiva: !!c.afiliado_exclusivo_id,
          entregas: pedidoIds.length,
        }),
      );
    }
  }

  revalidatePath("/admin/lotes");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas e RPCs 0074/0215 fora dos tipos gerados
async function otimizarRotaDoLote(sb: any, loteId: string): Promise<void> {
  const [{ data: lote }, { data: paradas }] = await Promise.all([
    sb.from("lotes_consolidacao").select("lojas(rua, numero, bairro, cidade, cep)").eq("id", loteId).maybeSingle(),
    sb.from("lote_pedidos").select("pedido_id, endereco").eq("lote_id", loteId).order("ordem"),
  ]);
  const loja = lote?.lojas as { rua?: string; numero?: string; bairro?: string; cidade?: string; cep?: string } | null;
  const origem = [[loja?.rua, loja?.numero].filter(Boolean).join(" "), loja?.bairro, loja?.cidade, loja?.cep]
    .filter(Boolean)
    .join(", ");
  const lista = (paradas ?? []) as { pedido_id: string; endereco: string | null }[];
  if (!origem || lista.length === 0 || lista.some((p) => !p.endereco)) return;

  const enderecos = lista.map((p) => p.endereco as string);
  const rota = await otimizarParadas(origem, enderecos);
  if (!rota.ok) return;

  const ordenadas = montarParadas(
    lista.map((p) => p.pedido_id),
    rota.valor,
  );
  if (ordenadas.some((p) => p.chegadaS == null)) return;
  const { error } = await sb.rpc("lote_definir_rota", {
    p_lote_id: loteId,
    p_pedido_ids: ordenadas.map((p) => p.pedidoId),
    p_chegadas_s: ordenadas.map((p) => p.chegadaS),
    p_distancia_m: rota.valor.distancia_m,
    p_duracao_s: rota.valor.duracao_s,
    p_link_mapa: linkRota(
      origem,
      rota.valor.ordem.map((i) => enderecos[i]),
    ),
  });
  if (error) throw new Error(error.message);
}

// Desfaz o lote (RPC 0074): cancela a corrida (se não coletada), libera os
// pedidos para novo lote e marca o lote Cancelado.
export async function cancelarLote(formData: FormData): Promise<void> {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const loteId = String(formData.get("lote_id") ?? "");
  if (!loteId) throw new Error("Lote inválido.");

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0074 fora dos tipos gerados
  const { error } = await (supabase as any).rpc("cancelar_lote_consolidacao", {
    p_lote_id: loteId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/lotes");
}
