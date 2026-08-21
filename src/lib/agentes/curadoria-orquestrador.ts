// Orquestra a curadoria automática de produto/loja: busca dados via
// service_role, roda as regras determinísticas (curadoria-regras.ts) e, só se
// houver pendência, chama o agente LangSmith pra redigir o texto humano.
// Nunca lança — chamado via `after()` fire-and-forget, falha aqui não pode
// derrubar o save do seller.

import { createServiceClient } from "@/lib/supabase/service";
import { avaliarProduto, avaliarLoja } from "./curadoria-regras";
import { gerarParecerProduto, gerarDicasLoja } from "./langsmith-curadoria";

export async function disparaCuradoriaProduto(produtoId: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { data: produto } = await supabase
      .from("produtos")
      .select("id, nome, descricao, categoria_id")
      .eq("id", produtoId)
      .maybeSingle();
    if (!produto) return;

    const { count } = await supabase
      .from("produto_imagens")
      .select("id", { count: "exact", head: true })
      .eq("produto_id", produtoId);

    const gaps = avaliarProduto(
      { nome: produto.nome, descricao: produto.descricao, categoria_id: produto.categoria_id },
      count ?? 0,
    );
    if (gaps.length === 0) return;

    const parecer = await gerarParecerProduto({ nome: produto.nome, descricao: produto.descricao }, gaps);
    if (!parecer) return;

    // Evita empilhar parecer velho a cada edição: só um pendente por vez.
    await supabase
      .from("produto_sugestoes_ia")
      .delete()
      .eq("produto_id", produtoId)
      .eq("tipo", "parecer")
      .eq("status", "pendente");

    await supabase.from("produto_sugestoes_ia").insert({
      produto_id: produtoId,
      tipo: "parecer",
      conteudo: parecer.texto || "Ver pendências identificadas na curadoria automática.",
      decisao_sugerida: parecer.decisaoSugerida,
      motivo: gaps.map((g) => g.mensagem).join(" "),
      criado_por: "langsmith-curadoria",
    });
  } catch (e) {
    console.error("[curadoria-orquestrador] falha ao curar produto", produtoId, e);
  }
}

export async function disparaCuradoriaLoja(lojaId: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { data: loja } = await supabase
      .from("lojas")
      .select("id, nome, cnpj, cep, cidade, estado, rua, numero, whatsapp, email, chave_pix_confirmada_em")
      .eq("id", lojaId)
      .maybeSingle();
    if (!loja) return;

    const gaps = avaliarLoja(loja);
    if (gaps.length === 0) return;

    // Sempre grava os avisos (regra determinística), mesmo se o agente falhar
    // — a dica gerada por IA é um enriquecimento de texto, não um requisito
    // pra o seller ver o que falta.
    const dicas = (await gerarDicasLoja({ nome: loja.nome }, gaps)) ?? gaps;

    // Evita empilhar aviso velho a cada edição: refaz os pendentes a cada
    // checagem, sem tocar nos que o seller já marcou resolvido/descartado.
    await supabase.from("loja_avisos_curadoria").delete().eq("loja_id", lojaId).eq("status", "pendente");

    await supabase.from("loja_avisos_curadoria").insert(
      dicas.map((d) => ({
        loja_id: lojaId,
        campo: d.campo,
        mensagem: d.mensagem,
        criado_por: "langsmith-curadoria",
      })),
    );
  } catch (e) {
    console.error("[curadoria-orquestrador] falha ao curar loja", lojaId, e);
  }
}
