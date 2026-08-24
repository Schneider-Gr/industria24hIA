import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { checarLimite } from "@/lib/rate-limit";

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
export async function GET(request: NextRequest) {
  // Achado de auditoria OWASP (#9, baixo): rota pública de catálogo sem rate
  // limit, mesmo padrão de cotar-frete (checarLimite), aqui por IP porque a
  // rota não exige login.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sem-ip";
  if (!checarLimite(`categorias:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  }

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
