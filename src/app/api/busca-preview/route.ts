import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { checarLimite } from "@/lib/rate-limit";

// Preview de busca do header (redesign vitrine — Navegação): até 5 produtos,
// mesma tabela/filtros da página /busca, só limitada para o dropdown.
/**
 * @openapi
 * /api/busca-preview:
 *   get:
 *     summary: Preview de busca (até 5 produtos aprovados) para o dropdown do header
 *     tags: [Vitrine]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Termo buscado no nome do produto (ilike)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 produtos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       nome: { type: string }
 *                       valor: { type: number }
 *                       img: { type: string, nullable: true }
 *       500:
 *         description: Erro ao consultar produtos
 */
export async function GET(request: NextRequest) {
  // Achado de auditoria OWASP (#9, baixo): mesmo rate limit por IP de
  // categorias/route.ts — busca com ilike é a query mais cara das duas.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sem-ip";
  if (!checarLimite(`busca-preview:${ip}`, 60, 60_000)) {
    return NextResponse.json({ produtos: [] }, { status: 429 });
  }

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
