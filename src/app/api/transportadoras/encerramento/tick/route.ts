import { NextResponse, type NextRequest } from "next/server";
import { respostaErroGenerico } from "@/lib/api/erro-generico";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { enviarEmail } from "@/lib/email";
import { registrarEvento } from "@/lib/observabilidade/registrar-evento";

const ORIGEM = "transportadoras/encerramento/tick";
const DIAS_AVISO = 7;

// Encerramento de transportadora global (spec admin-transportadoras/
// transportadora-global): e-mail às lojas que a usam 7 dias antes da data e,
// na data, a global deixa de estar ativa nessas lojas. Diário pelo Vercel
// Cron, no padrão de /api/estoque/alerta/tick, com idempotência em
// alertas_enviados.
async function varrer(): Promise<Response> {
  if (!isServiceConfigured) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 503 });
  }
  const svc = createServiceClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const limite = new Date(Date.now() + DIAS_AVISO * 86400000).toISOString().slice(0, 10);

  const { data: globais, error } = await svc
    .from("transportadoras")
    .select("id, nome, encerra_em")
    .is("loja_id", null)
    .not("encerra_em", "is", null)
    .lte("encerra_em", limite);
  if (error) {
    await registrarEvento({ capability: "cron", origem: ORIGEM, resultado: "falha", motivo: error.message });
    return respostaErroGenerico(error, 500, { tags: { area: ORIGEM } });
  }

  let avisos = 0;
  let desativadas = 0;
  const erros: string[] = [];

  for (const g of globais ?? []) {
    const encerra = g.encerra_em as string;
    if (encerra <= hoje) {
      const { data, error: e } = await svc
        .from("loja_transportadoras")
        .update({ ativo: false })
        .eq("transportadora_id", g.id)
        .eq("ativo", true)
        .select("loja_id");
      if (e) erros.push(`${g.nome}: ${e.message}`);
      desativadas += data?.length ?? 0;
      continue;
    }

    const chave = `transp-encerra:${g.id}:${encerra}`;
    const { data: ja } = await svc.from("alertas_enviados").select("chave").eq("chave", chave).maybeSingle();
    if (ja) continue;

    const { data: ativacoes } = await svc
      .from("loja_transportadoras")
      .select("lojas(email)")
      .eq("transportadora_id", g.id)
      .eq("ativo", true);
    const emails = [...new Set((ativacoes ?? []).map((a) => a.lojas?.email).filter((x): x is string => !!x))];
    const dataBr = encerra.split("-").reverse().join("/");
    let falhou = false;
    for (const to of emails) {
      const r = await enviarEmail({
        to,
        subject: `A ${g.nome} sai da Indústria 24h em ${dataBr}`,
        text: `A transportadora ${g.nome}, ativa na sua loja, deixa de ser oferecida no checkout em ${dataBr}. Para continuar usando, cadastre-a como transportadora própria em https://industria24.com.br/seller/transportadoras antes dessa data.`,
      });
      if (r.enviado) avisos++;
      else if (!r.naoEntregavel) {
        falhou = true;
        if (r.erro) erros.push(r.erro);
      }
    }
    // Só marca como avisado se nenhum envio falhou de forma recuperável.
    if (!falhou) {
      await svc.from("alertas_enviados").upsert({ chave, enviado_em: new Date().toISOString() }, { onConflict: "chave" });
    }
  }

  const resultado = { globais: (globais ?? []).length, avisos, desativadas, erros };
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
