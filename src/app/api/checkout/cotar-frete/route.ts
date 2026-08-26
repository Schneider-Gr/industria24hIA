import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { isUberDirectConfigured, cotarEntrega } from "@/lib/uber-direct";
import { checarLimite } from "@/lib/rate-limit";
import { montarOpcaoInterna, montarOpcaoUberDirect, decidirOpcoesFrete } from "@/lib/checkout/opcoes-frete";

// Cotação de frete no checkout (PRD 008, Milestone 1): interna cobre o CEP?
// devolve o percentual já em produção. Não cobre? cota Uber Direct de
// verdade e grava a cotação em cotacoes_frete_externo — o RPC
// checkout_criar_pedido usa esse valor gravado, nunca um número vindo do
// client (ver migration 0140).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  if (!checarLimite(`cotar-frete:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    loja_id?: string;
    cep?: string;
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    valor_itens?: number;
    peso_kg?: number;
  } | null;

  const lojaId = body?.loja_id;
  const cepDigitos = (body?.cep ?? "").replace(/\D/g, "");
  const valorItens = Number(body?.valor_itens ?? 0);
  if (!lojaId || cepDigitos.length !== 8 || !(valorItens > 0)) {
    return NextResponse.json({ error: "Dados de entrega incompletos." }, { status: 400 });
  }
  // Placeholder documentado em docs/prd/fluxo-frete-completo.md: só 89/358
  // produtos têm peso confiável hoje. Sem peso do carrinho, tenta faixa 0kg.
  const pesoKg = Number(body?.peso_kg ?? 0);

  // Tabela importada (0145/0146) tem prioridade sobre o % — sem faixa
  // aplicável (override da loja ou global), cai para cotar_frete_interno.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0146 fora dos tipos gerados
  const { data: tabelaRows } = await (supabase as any).rpc("cotar_frete_tabela", {
    p_loja_id: lojaId,
    p_cep: Number(cepDigitos),
    p_peso: pesoKg,
  });
  const tabelaRow = (tabelaRows as { transportadora_id: string; valor: number }[] | null)?.[0];

  if (tabelaRow) {
    return NextResponse.json({
      opcoes: decidirOpcoesFrete(
        {
          tipo: "interna",
          transportadoraId: tabelaRow.transportadora_id,
          nome: "Frete (tabela da transportadora)",
          valor: tabelaRow.valor,
        },
        null,
      ),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC 0140 fora dos tipos gerados
  const { data: internaRows } = await (supabase as any).rpc("cotar_frete_interno", {
    p_loja_id: lojaId,
    p_cep: Number(cepDigitos),
  });
  const internaRow = (internaRows as { transportadora_id: string | null; percentual: number }[] | null)?.[0];

  if (internaRow) {
    return NextResponse.json({
      opcoes: decidirOpcoesFrete(
        montarOpcaoInterna(internaRow.transportadora_id, "Frete padrão", internaRow.percentual, valorItens),
        null,
      ),
    });
  }

  if (!isUberDirectConfigured || !isServiceConfigured) {
    return NextResponse.json({ opcoes: [] });
  }
  if (!body?.rua || !body?.numero || !body?.cidade) {
    return NextResponse.json({ opcoes: [] });
  }

  const svc = createServiceClient();
  const { data: loja } = await svc
    .from("lojas")
    .select("cep, rua, numero, bairro, cidade, estado, complemento")
    .eq("id", lojaId)
    .maybeSingle();
  if (!loja?.cep || !loja.rua || !loja.numero || !loja.cidade || !loja.estado) {
    return NextResponse.json({ opcoes: [] });
  }

  try {
    const cotacao = await cotarEntrega({
      origem: {
        rua: loja.rua,
        numero: loja.numero,
        bairro: loja.bairro ?? undefined,
        cidade: loja.cidade,
        uf: loja.estado,
        cep: loja.cep,
        complemento: loja.complemento ?? undefined,
      },
      destino: {
        rua: body.rua,
        numero: body.numero,
        bairro: body.bairro ?? undefined,
        cidade: body.cidade,
        uf: loja.estado,
        cep: cepDigitos,
      },
    });

    const transportadoraUberDirectId = "00000000-0000-4000-8000-0000000000e1";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0139 fora dos tipos gerados
    const { data: cotacaoSalva, error } = await (svc as any)
      .from("cotacoes_frete_externo")
      .insert({
        loja_id: lojaId,
        cep: cepDigitos,
        fee_centavos: cotacao.feeCentavos,
        prazo_min: cotacao.duracaoMin,
        expira_em: cotacao.expiraEm,
      })
      .select("id")
      .single();
    if (error || !cotacaoSalva) {
      throw new Error(`Falha ao gravar cotação Uber Direct: ${error?.message}`);
    }

    return NextResponse.json({
      opcoes: decidirOpcoesFrete(
        null,
        montarOpcaoUberDirect(
          transportadoraUberDirectId,
          cotacaoSalva.id,
          cotacao.feeCentavos,
          cotacao.duracaoMin,
        ),
      ),
    });
  } catch (erro) {
    // Fora de área de cobertura / erro do provider: opção simplesmente não
    // aparece (PRD 008 US01, edge case) — falha silenciosa para o comprador,
    // log técnico para monitoramento.
    Sentry.captureException(erro, {
      tags: { area: "checkout", gateway: "uber_direct", signal: "cotacao_checkout" },
    });
    return NextResponse.json({ opcoes: [] });
  }
}
