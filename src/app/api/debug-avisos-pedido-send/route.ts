import { NextResponse, type NextRequest } from "next/server";
import {
  enviarBubblewhats,
  mensagemSaiuParaEntrega,
  mensagemDisputaAbertaLoja,
  mensagemPropostaResolucaoComprador,
  mensagemDecisaoDisputa,
} from "@/lib/bubblewhats";

// TEMPORÁRIO — teste manual em preview do PR #351. Remover antes do merge.
// Envia os 4 templates novos (dados sintéticos) para o jid informado, só
// para validar template + envio real via BubbleWhats.
const DEBUG_TOKEN = "8f2c6a1e9d4b7053c8e1a6f0d9b4c7250e3a8d5f1c9b6e4a72d0f8c3b5a91e6d";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const jid = request.nextUrl.searchParams.get("jid");
  if (token !== DEBUG_TOKEN) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  if (!jid) return NextResponse.json({ error: "jid obrigatório" }, { status: 400 });

  const link = "https://industria24.com.br/pedido/teste-debug";
  const resultados = {
    saiu_para_entrega: await enviarBubblewhats(jid, mensagemSaiuParaEntrega({ idVenda: "TESTE-1", linkPedido: link })),
    disputa_aberta: await enviarBubblewhats(
      jid,
      mensagemDisputaAbertaLoja({ idVenda: "TESTE-1", motivo: "produto_avariado", linkDisputa: link })
    ),
    proposta_resolucao: await enviarBubblewhats(
      jid,
      mensagemPropostaResolucaoComprador({ idVenda: "TESTE-1", linkDisputa: link })
    ),
    decisao_disputa: await enviarBubblewhats(
      jid,
      mensagemDecisaoDisputa({ idVenda: "TESTE-1", decisao: "Reembolso parcial", destinatario: "comprador", linkDisputa: link })
    ),
  };

  return NextResponse.json(resultados);
}
