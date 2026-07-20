import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Alimenta o mega-menu do header (client component). Tabelas `categorias` e
// `subcategorias` já existentes — nenhuma coluna nova.
export const revalidate = 300;

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ categorias: [] });
  }
  const supabase = createPublicClient();
  const [{ data: categorias }, { data: subcategorias }] = await Promise.all([
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase.from("subcategorias").select("id, nome, categoria_id").order("nome"),
  ]);

  return NextResponse.json({
    categorias: (categorias ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      subcategorias: (subcategorias ?? [])
        .filter((s) => s.categoria_id === c.id)
        .map((s) => ({ id: s.id, nome: s.nome })),
    })),
  });
}
