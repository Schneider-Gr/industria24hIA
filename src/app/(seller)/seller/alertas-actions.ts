"use server";

import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { montarAlertas, type Alerta } from "@/lib/seller/alertas";

// O que chegou do comprador e pede resposta do seller: cotação de frete ainda
// no prazo, disputa em andamento e mensagem não lida. Lê só a loja do próprio
// seller (getMinhaLoja + RLS). Chamado pelo AlertasPopup a cada 45 s.
export async function buscarAlertasSeller(): Promise<Alerta[]> {
  const loja = await getMinhaLoja();
  if (!loja) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: cotacoes }, { data: disputas }, { data: mensagens }] = await Promise.all([
    supabase
      .from("cotacoes_frete_vendedor")
      .select("id, criado_em, itens, bairro_destino, cidade_destino")
      .eq("loja_id", loja.id)
      .eq("status", "aguardando")
      .gt("responder_ate", new Date().toISOString())
      .order("criado_em", { ascending: false })
      .limit(10),
    supabase
      .from("disputas")
      .select("id, aberta_em, motivo, descricao")
      .eq("loja_id", loja.id)
      .in("status", ["aberta", "em_atendimento_loja", "em_mediacao_admin"])
      .order("aberta_em", { ascending: false })
      .limit(10),
    supabase
      .from("mensagens")
      .select("id, conversa_id, created_at, corpo, conversas!inner(loja_id)")
      .eq("conversas.loja_id", loja.id)
      .neq("autor_id", user.id)
      .is("lida_em", null)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const itens = (cotacoes ?? []).map((c) => ((c.itens as { produto_id: string; quantidade: number }[]) ?? [])[0]);
  const ids = [...new Set(itens.filter(Boolean).map((i) => i.produto_id))];
  const { data: produtos } = ids.length
    ? await supabase.from("produtos").select("id, nome").in("id", ids)
    : { data: [] as { id: string; nome: string }[] };
  const nome = new Map((produtos ?? []).map((p) => [p.id, p.nome]));

  return montarAlertas({
    cotacoes: (cotacoes ?? []).map((c, i) => ({
      id: c.id,
      criado_em: c.criado_em,
      produto: nome.get(itens[i]?.produto_id) ?? "Produto",
      quantidade: itens[i]?.quantidade ?? 0,
      lugar: [c.bairro_destino, c.cidade_destino].filter(Boolean).join(", ") || "CEP informado",
    })),
    disputas: (disputas ?? []).map((d) => ({
      id: d.id,
      aberta_em: d.aberta_em ?? new Date(0).toISOString(),
      motivo: d.motivo,
      descricao: d.descricao,
    })),
    mensagens: (mensagens ?? []).map((m) => ({ id: m.id, conversa_id: m.conversa_id, created_at: m.created_at, corpo: m.corpo })),
  });
}
