import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Preview de busca do header (redesign vitrine — Navegação): até 5 produtos,
// mesma tabela/filtros da página /busca, só limitada para o dropdown.
export async function GET(request: NextRequest) {
  const termo = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!termo || !isSupabaseConfigured) {
    return NextResponse.json({ produtos: [] });
  }

  const supabase = createPublicClient();
  const { data: produtosRaw, error } = await supabase
    .from("produtos")
    .select("id, nome, valor, produto_imagens(url, ordem)")
    .ilike("nome", `%${termo}%`)
    .gt("valor", 0)
    .eq("status_produto", "Aprovado")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ produtos: [] }, { status: 500 });
  }

  const produtos = (produtosRaw ?? []).map((p) => {
    const imagens = Array.isArray(p.produto_imagens) ? p.produto_imagens : [];
    const primeira = [...imagens].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))[0];
    return { id: p.id, nome: p.nome, valor: p.valor, img: primeira?.url ?? null };
  });

  return NextResponse.json({ produtos });
}
