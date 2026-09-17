import { NextResponse, type NextRequest } from "next/server";
import { respostaErroGenerico } from "@/lib/api/erro-generico";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { enviarEmail, templateEstoqueRuptura, type ProdutoAlertaEstoque } from "@/lib/email";
import { registrarEvento } from "@/lib/observabilidade/registrar-evento";
import { estadoEstoque, foraDaVitrine } from "@/lib/seller/estoque-estado";

const ORIGEM = "estoque/alerta/tick";

/** Reenvio só depois disso, mesmo com o produto parado no mesmo estado. */
const DIAS_ATE_REPETIR = 7;

// Varredura diária de ruptura: um e-mail por loja com o que esgotou e o que
// está crítico. Disparada pelo Vercel Cron (vercel.json) — o plano do projeto
// só permite cron diário, o que basta aqui: reposição de estoque não é evento
// de minuto. POST continua disponível para chamada manual, mesmo padrão de
// /api/carrinho/abandono/tick.
async function varrer(): Promise<Response> {
  if (!isServiceConfigured) {
    await registrarEvento({
      capability: "cron",
      origem: ORIGEM,
      resultado: "falha",
      motivo: "SUPABASE_SERVICE_ROLE_KEY não configurada",
    });
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 503 });
  }

  const svc = createServiceClient();

  const { data: produtos, error } = await svc
    .from("produtos")
    .select("id, nome, loja_id, estoque_atual, quantidade_minima")
    .eq("status_produto", "Aprovado");
  if (error) {
    await registrarEvento({ capability: "cron", origem: ORIGEM, resultado: "falha", motivo: error.message });
    return respostaErroGenerico(error, 500, { tags: { area: ORIGEM } });
  }

  // Reserva ativa muda o veredito: esgotado com venda futura continua vendendo
  // e não entra no alerta como perda (0173).
  const { data: reservas } = await svc
    .from("vendas_futuras")
    .select("produto_id")
    .gt("estoque", 0);
  const comReserva = new Set((reservas ?? []).map((v) => v.produto_id));

  const porLoja = new Map<string, ProdutoAlertaEstoque[]>();
  for (const p of produtos ?? []) {
    const dados = {
      estoque_atual: p.estoque_atual,
      quantidade_minima: p.quantidade_minima,
      temReserva: comReserva.has(p.id),
    };
    const estado = estadoEstoque(dados);
    if (estado === "normal") continue;
    // Esgotado que segue vendendo por reserva não é pendência.
    if (estado === "esgotado" && !foraDaVitrine(dados)) continue;

    const lista = porLoja.get(p.loja_id) ?? [];
    lista.push({
      id: p.id,
      nome: p.nome,
      estoque_atual: p.estoque_atual,
      quantidade_minima: p.quantidade_minima,
      foraDaVitrine: foraDaVitrine(dados),
    });
    porLoja.set(p.loja_id, lista);
  }

  if (porLoja.size === 0) {
    const vazio = { lojas: 0, enviados: 0, erros: [] as string[] };
    await registrarEvento({ capability: "cron", origem: ORIGEM, resultado: "sucesso", metadata: vazio });
    return NextResponse.json(vazio);
  }

  const { data: lojas } = await svc
    .from("lojas")
    .select("id, nome, email")
    .in("id", [...porLoja.keys()]);
  const lojaPorId = new Map((lojas ?? []).map((l) => [l.id, l]));

  // Estado já avisado: `estoque:<produto>:<estado>`. Enquanto o produto não
  // mudar de estado (ou passar a janela de repetição), não avisa de novo.
  const corte = new Date(Date.now() - DIAS_ATE_REPETIR * 24 * 60 * 60 * 1000).toISOString();
  const { data: jaAvisados } = await svc
    .from("alertas_enviados")
    .select("chave")
    .gte("enviado_em", corte)
    .like("chave", "estoque:%");
  const suprimidos = new Set((jaAvisados ?? []).map((a) => a.chave));
  const chave = (p: ProdutoAlertaEstoque) =>
    `estoque:${p.id}:${p.foraDaVitrine ? "fora" : "critico"}`;

  let enviados = 0;
  const erros: string[] = [];
  for (const [lojaId, lista] of porLoja) {
    const novos = lista.filter((p) => !suprimidos.has(chave(p)));
    if (novos.length === 0) continue;

    const loja = lojaPorId.get(lojaId);
    if (!loja?.email) {
      erros.push(`loja ${lojaId} sem e-mail cadastrado`);
      continue;
    }

    const fora = novos.filter((p) => p.foraDaVitrine).length;
    const { enviado, erro, naoEntregavel } = await enviarEmail({
      to: loja.email,
      subject:
        fora > 0
          ? `${fora} produto(s) saíram da vitrine por falta de estoque`
          : `${novos.length} produto(s) com estoque crítico`,
      text: novos
        .map((p) => `- ${p.nome}: ${p.estoque_atual ?? 0} un${p.foraDaVitrine ? " (fora da vitrine)" : ""}`)
        .join("\n"),
      html: templateEstoqueRuptura(novos),
    });
    // Loja com e-mail impossível: grava a supressão assim mesmo, senão a mesma
    // loja é reprocessada em toda rodada e o alerta nunca sai da fila. A
    // ausência de e-mail válido já aparece como erro logo acima.
    if (naoEntregavel) {
      erros.push(`loja ${lojaId}: ${erro}`);
      await svc
        .from("alertas_enviados")
        .upsert(
          novos.map((p) => ({ chave: chave(p), enviado_em: new Date().toISOString() })),
          { onConflict: "chave" },
        );
      continue;
    }
    if (!enviado) {
      if (erro) erros.push(erro);
      continue;
    }
    enviados++;

    // Grava depois do envio: falha de e-mail não pode suprimir o aviso de
    // amanhã. O upsert cobre o caso de o produto voltar ao mesmo estado.
    await svc
      .from("alertas_enviados")
      .upsert(
        novos.map((p) => ({ chave: chave(p), enviado_em: new Date().toISOString() })),
        { onConflict: "chave" },
      );
  }

  const resultado = { lojas: porLoja.size, enviados, erros };
  await registrarEvento({
    capability: "cron",
    origem: ORIGEM,
    resultado: erros.length > 0 ? "alerta" : "sucesso",
    motivo: erros.length > 0 ? erros.join("; ") : undefined,
    metadata: resultado,
  });
  return NextResponse.json(resultado);
}

// Vercel Cron: sempre GET, com `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  return varrer();
}

export async function POST(req: NextRequest) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  return varrer();
}
