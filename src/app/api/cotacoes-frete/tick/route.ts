import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { avisarComprador, avisarSellerNovaCotacao } from "@/lib/catalogo-compra/avisos-cotacao-frete";

// Tick da entrega a combinar (PRD 050, 0203), chamado de hora em hora pelo
// GitHub Actions (.github/workflows/cotacoes-frete-tick.yml): os crons da
// Vercel neste plano rodam uma vez por dia. Só avisa; a validade das
// cotações é conferida na leitura e no checkout, então um tick atrasado
// nunca deixa uma cotação vencida valer. Idempotente por lembrete_em e
// aviso_expiracao_em.
async function varrer() {
  if (!isServiceConfigured) return NextResponse.json({ error: "service role ausente" }, { status: 503 });
  const svc = createServiceClient();
  const agora = new Date();
  const doze = new Date(agora.getTime() - 12 * 3600_000).toISOString();

  const { data: paraLembrar } = await svc
    .from("cotacoes_frete_vendedor")
    .select("id")
    .eq("status", "aguardando")
    .is("lembrete_em", null)
    .lte("criado_em", doze)
    .gt("responder_ate", agora.toISOString())
    .limit(200);

  let lembretes = 0;
  for (const { id } of paraLembrar ?? []) {
    // Marca antes de enviar: aviso repetido incomoda mais que um perdido.
    const { data: marcado } = await svc
      .from("cotacoes_frete_vendedor")
      .update({ lembrete_em: agora.toISOString() })
      .eq("id", id)
      .is("lembrete_em", null)
      .select("id");
    if (marcado?.length) {
      await avisarSellerNovaCotacao(svc, id, true);
      lembretes++;
    }
  }

  const { data: expiradas } = await svc
    .from("cotacoes_frete_vendedor")
    .select("id")
    .eq("status", "aguardando")
    .lte("responder_ate", agora.toISOString())
    .limit(200);

  let expiracoes = 0;
  for (const { id } of expiradas ?? []) {
    const { data: marcado } = await svc
      .from("cotacoes_frete_vendedor")
      .update({ status: "expirada", aviso_expiracao_em: agora.toISOString() })
      .eq("id", id)
      .eq("status", "aguardando")
      .select("id");
    if (marcado?.length) {
      await avisarComprador(svc, id);
      expiracoes++;
    }
  }

  return NextResponse.json({ lembretes, expiracoes });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  try {
    return await varrer();
  } catch (erro) {
    Sentry.captureException(erro, { tags: { area: "cotacao_frete", signal: "tick" } });
    return NextResponse.json({ error: "falha no tick" }, { status: 500 });
  }
}
