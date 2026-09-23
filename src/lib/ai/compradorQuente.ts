import { scoreJev } from "./leadScoring";
import type { ServiceClient } from "./botDb";
import { enviarBubblewhats } from "@/lib/bubblewhats";
import { normalizeWhatsapp } from "@/lib/whatsapp";

// #745: no chat comprador↔loja o bot só chamava a loja quando o comprador pedia
// humano. Quem já pede quantidade, prazo ou preço segue com o bot; aqui a loja
// é avisada no WhatsApp assim que o Jev vê o comprador quente (mesma pergunta e
// limiar do lead scoring), uma única vez por conversa (alertas_enviados).
export function mensagemCompradorQuenteLoja(args: { compradorNome?: string | null; produtoNome?: string | null; link: string }): string {
  const quem = args.compradorNome?.trim() || "Um comprador";
  const sobre = args.produtoNome ? ` sobre ${args.produtoNome}` : "";
  return `🔥 Indústria 24h: ${quem} está pronto para comprar${sobre}.\nO assistente está respondendo por você. Assuma a conversa: ${args.link}`;
}

export async function avisarLojaSeCompradorQuente(
  svc: ServiceClient,
  conversa: { id: string; loja_id: string; comprador_nome?: string | null },
  historico: { autor: "comprador" | "bot"; corpo: string }[],
  produtoNome?: string | null,
): Promise<void> {
  const chave = `comprador-quente:${conversa.id}`;
  const { data: jaAvisou } = await svc.from("alertas_enviados").select("chave").eq("chave", chave).maybeSingle();
  if (jaAvisou) return;

  const score = await scoreJev(historico.map((m) => ({ remetente: m.autor === "comprador" ? "usuario" : "bot", conteudo: m.corpo })));
  if (score !== "quente") return;

  const { data: loja } = await svc.from("lojas").select("whatsapp").eq("id", conversa.loja_id).maybeSingle();
  const jid = normalizeWhatsapp(loja?.whatsapp);
  if (!jid) return;

  const link = `https://industria24.com.br/seller/mensagens/${conversa.id}`;
  const envio = await enviarBubblewhats(jid, mensagemCompradorQuenteLoja({ compradorNome: conversa.comprador_nome, produtoNome, link }));
  // Só marca com envio ok: falha de WhatsApp tenta de novo na próxima mensagem quente.
  if (envio.ok) await svc.from("alertas_enviados").upsert({ chave, enviado_em: new Date().toISOString() }, { onConflict: "chave" });
}
