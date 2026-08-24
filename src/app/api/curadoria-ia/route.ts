import { NextResponse, type NextRequest } from "next/server";
import { respostaErroGenerico } from "@/lib/api/erro-generico";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

// Ingestão das sugestões do agente CrewAI de curadoria (descrição/imagem/dados
// de loja) em produto_sugestoes_ia (migration 0082). O agente nunca escreve
// direto no Supabase — chama esta rota, autenticada pelo próprio token, que
// usa service_role só para inserir a proposta. Aplicar/descartar continua
// sendo decisão humana do admin em /admin/produtos/[id] (ver SugestoesIA.tsx).
const TIPOS = new Set(["descricao", "imagem", "dados_loja"]);

// BOM/espaço no início: mesmo bug real de env var salva via PowerShell/Windows
// que já quebrou o Supabase em prod (ver lib/supabase/env.ts).
const clean = (v: string | undefined) => (v ?? "").replace(/^[﻿​]+/, "").trim();

export async function POST(req: NextRequest) {
  const token = clean(process.env.CREWAI_CURADORIA_TOKEN);
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!isServiceConfigured) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { produto_id, tipo, conteudo, motivo } = (body ?? {}) as Record<string, unknown>;

  if (typeof produto_id !== "string" || !produto_id) {
    return NextResponse.json({ error: "produto_id é obrigatório" }, { status: 400 });
  }
  if (typeof tipo !== "string" || !TIPOS.has(tipo)) {
    return NextResponse.json(
      { error: "tipo deve ser descricao, imagem ou dados_loja" },
      { status: 400 },
    );
  }
  if (typeof conteudo !== "string" || !conteudo.trim()) {
    return NextResponse.json({ error: "conteudo é obrigatório" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: produto } = await supabase
    .from("produtos")
    .select("id")
    .eq("id", produto_id)
    .maybeSingle();
  if (!produto) {
    return NextResponse.json({ error: "produto não encontrado" }, { status: 404 });
  }

  const { data: sugestao, error } = await supabase
    .from("produto_sugestoes_ia")
    .insert({
      produto_id,
      tipo,
      conteudo,
      motivo: typeof motivo === "string" && motivo.trim() ? motivo : null,
    })
    .select("id")
    .single();

  if (error) {
    return respostaErroGenerico(error, 500, { tags: { area: "curadoria-ia" } });
  }

  return NextResponse.json({ ok: true, id: sugestao.id }, { status: 201 });
}
