import { NextResponse, type NextRequest } from "next/server";
import { enviarBubblewhats } from "@/lib/bubblewhats";

// TEMPORÁRIO — teste manual em preview do PR #349. Remover antes do merge.
// Token descartável gerado só para esta rodada de teste (não é segredo real).
const SECRET = "296de33155b62717d1e97f4ad7dbe37ace622cb4c5f65b33";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const jid = request.nextUrl.searchParams.get("jid");
  if (!SECRET || secret !== SECRET) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!jid) {
    return NextResponse.json({ error: "jid obrigatório" }, { status: 400 });
  }
  const resultado = await enviarBubblewhats(jid, "Teste BubbleWhats — industria24.com.br (PR #349, endpoint de debug temporário).");
  return NextResponse.json(resultado);
}
