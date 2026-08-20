import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Alimenta o mega-menu do header (client component). Tabelas `categorias` e
// `subcategorias` já existentes — nenhuma coluna nova.
export const revalidate = 300;

/**
 * @openapi
 * /api/categorias:
 *   get:
 *     summary: Lista categorias e subcategorias para o mega-menu
 *     tags: [Vitrine]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categorias:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       nome: { type: string }
 *                       subcategorias:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             nome: { type: string }
 */
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ categorias: [] });
  }
  const supabase = createPublicClient();
  const [{ data: categorias }, { data: subcategorias }] = await Promise.all([
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase.from("subcategorias").select("id, nome, categoria_id").order("nome"),
  ]);

  // O banco tem subcategorias repetidas pelo nome dentro da mesma categoria
  // (mesma sujeira já vista em `categorias`). Enquanto o dado não é limpo, o
  // menu mostra uma entrada por nome — a primeira, em ordem alfabética.
  const semDuplicadas = (categoriaId: string) => {
    const vistos = new Set<string>();
    return (subcategorias ?? [])
      .filter((s) => s.categoria_id === categoriaId)
      .filter((s) => {
        const chave = s.nome.trim().toLocaleLowerCase("pt-BR");
        if (vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
      })
      .map((s) => ({ id: s.id, nome: s.nome }));
  };

  return NextResponse.json({
    categorias: (categorias ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      subcategorias: semDuplicadas(c.id),
    })),
  });
}
