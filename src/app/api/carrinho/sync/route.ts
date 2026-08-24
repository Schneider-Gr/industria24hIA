import { NextResponse, type NextRequest } from "next/server";
import { respostaErroGenerico } from "@/lib/api/erro-generico";
import { createClient } from "@/lib/supabase/server";

// Espelho server-side do carrinho (localStorage é invisível ao backend).
// Chamado (debounced) pelo CarrinhoProvider a cada mudança de itens.
// Zera lembrete_enviado_em: se o carrinho mudou, o abandono anterior não
// vale mais e o job pode avisar de novo se ele parar de novo.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { itens } = await req.json();
  if (!Array.isArray(itens)) {
    return NextResponse.json({ error: "itens inválido" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0094 fora dos tipos gerados
  const { error } = await (supabase as any).from("carrinhos_abandonados").upsert({
    user_id: user.id,
    email: user.email ?? "",
    itens,
    atualizado_em: new Date().toISOString(),
    lembrete_enviado_em: null,
  });
  if (error) return respostaErroGenerico(error, 500, { tags: { area: "carrinho-sync" } });

  return NextResponse.json({ ok: true });
}
