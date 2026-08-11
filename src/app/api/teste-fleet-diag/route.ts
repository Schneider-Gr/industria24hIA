import { NextRequest, NextResponse } from "next/server";
import { pedirParecerFleet } from "@/lib/ai/curadoriaFleet";

// Sem token fixo no código (secret-scan bloqueia string hardcoded de alta
// entropia): o valor vem só de env, setado no painel Vercel na hora do teste
// e nunca commitado.
export async function GET(req: NextRequest) {
  const token = process.env.TESTE_FLEET_DIAG_TOKEN;
  const auth = req.headers.get("authorization");
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const resultado = await pedirParecerFleet(
    "Produto: Parafuso sextavado M8. Categoria: presente. Descrição: Parafuso bom.",
  );
  return NextResponse.json(resultado);
}
