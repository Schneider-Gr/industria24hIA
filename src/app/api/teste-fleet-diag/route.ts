import { NextRequest, NextResponse } from "next/server";
import { pedirParecerFleet } from "@/lib/ai/curadoriaFleet";

const TOKEN = "8y_PVj5DcWF_XxyIWMmzwmC14M7ixrSL";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${TOKEN}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const resultado = await pedirParecerFleet(
    "Produto: Parafuso sextavado M8. Categoria: presente. Descrição: Parafuso bom.",
  );
  return NextResponse.json(resultado);
}
