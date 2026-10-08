// Envio de Web Push (app do entregador). Server-only.
// Sem as chaves VAPID o envio vira no-op: a notificação é um ganho por cima do
// WhatsApp e da tela, nunca pode derrubar o pagamento ou o despacho.

import webpush from "web-push";
import type { createServiceClient } from "@/lib/supabase/service";
import type { AvisoPush } from "@/lib/logistica-parceiro/aviso-corrida";

const PUBLICA = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
const PRIVADA = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
// Contato exigido pelo protocolo VAPID: é para onde o serviço de push do
// navegador escreve se o remetente estiver abusando.
const CONTATO = (process.env.VAPID_SUBJECT ?? "https://industria24.com.br").trim();

export const isPushConfigurado = PUBLICA.length > 0 && PRIVADA.length > 0;

let pronto = false;
function prepara() {
  if (!pronto) {
    webpush.setVapidDetails(CONTATO, PUBLICA, PRIVADA);
    pronto = true;
  }
}

type Svc = ReturnType<typeof createServiceClient>;
type Inscricao = { id: string; endpoint: string; p256dh: string; auth: string };

/** Manda o aviso para todos os aparelhos inscritos desses usuários. Devolve
 *  quantos envios deram certo. Nunca lança: falha de um aparelho não afeta os
 *  outros, e inscrição que o navegador já descartou (404/410) é apagada. */
export async function enviarPush(svc: Svc, userIds: string[], aviso: AvisoPush): Promise<number> {
  if (!isPushConfigurado || userIds.length === 0) return 0;
  try {
    prepara();
    const { data } = await svc
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela da 0216 fora dos tipos gerados
      .from("push_inscricoes" as any)
      .select("id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    const inscricoes = (data ?? []) as unknown as Inscricao[];
    const corpo = JSON.stringify(aviso);
    const mortas: string[] = [];
    const resultados = await Promise.all(
      inscricoes.map((i) =>
        webpush
          .sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, corpo, {
            TTL: 300, // corrida exclusiva vale 5 min: depois disso o aviso não serve mais
            urgency: "high",
          })
          .then(() => true)
          .catch((erro: { statusCode?: number }) => {
            if (erro?.statusCode === 404 || erro?.statusCode === 410) mortas.push(i.id);
            else console.error(`[push] envio falhou: status=${erro?.statusCode ?? "?"}`);
            return false;
          }),
      ),
    );
    if (mortas.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela da 0216 fora dos tipos gerados
      await svc.from("push_inscricoes" as any).delete().in("id", mortas);
    }
    return resultados.filter(Boolean).length;
  } catch (erro) {
    console.error("[push] falha ao enviar:", erro);
    return 0;
  }
}

/** Quem recebe o aviso de uma corrida nova: o afiliado com exclusividade, ou,
 *  sem ele, todos os parceiros logísticos aprovados (pool). */
export async function destinatariosDaCorrida(svc: Svc, afiliadoExclusivoId: string | null): Promise<string[]> {
  if (afiliadoExclusivoId) return [afiliadoExclusivoId];
  const { data } = await svc.from("parceiros_logisticos").select("user_id").eq("status", "Aprovado");
  return [...new Set(((data ?? []) as { user_id: string | null }[]).map((p) => p.user_id).filter((u): u is string => !!u))];
}
