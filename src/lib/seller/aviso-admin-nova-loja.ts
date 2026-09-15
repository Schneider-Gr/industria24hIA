// Aviso ao admin quando uma loja nova entra em análise: e-mail (Resend) e
// WhatsApp (BubbleWhats). Best-effort: roda em after() depois do INSERT, um
// canal não bloqueia o outro e falha vai pro Sentry — nunca desfaz a loja.
// Issue #651, change `aviso-admin-nova-loja`.

import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarEmail } from "@/lib/email";
import { enviarBubblewhats } from "@/lib/bubblewhats";
import { normalizeWhatsapp } from "@/lib/whatsapp";
import {
  ASSUNTO_NOVA_LOJA,
  EMAIL_ADMIN_NOVA_LOJA,
  mensagemNovaSolicitacaoLoja,
  templateNovaSolicitacaoLoja,
  textoEmailNovaSolicitacaoLoja,
  type DadosNovaLoja,
} from "./nova-loja-mensagens";

const tags = (canal: string) => ({ area: "admin-aviso-nova-loja", canal });

export async function avisarAdminNovaLoja(lojaId: string): Promise<void> {
  const service = createServiceClient();
  const { data: loja, error } = await service
    .from("lojas")
    .select("id, nome, email, whatsapp, cidade, estado, created_at, owner_id")
    .eq("id", lojaId)
    .single();
  if (error || !loja) {
    Sentry.captureMessage("Aviso de nova loja: loja não encontrada", {
      level: "error",
      tags: tags("dados"),
      extra: { lojaId, erro: error?.message },
    });
    return;
  }

  // E-mail de contato da loja é opcional no formulário; cai no e-mail da conta.
  let emailContato = loja.email;
  if (!emailContato && loja.owner_id) {
    const { data } = await service.auth.admin.getUserById(loja.owner_id);
    emailContato = data.user?.email ?? null;
  }

  const dados: DadosNovaLoja = {
    id: loja.id,
    nome: loja.nome,
    emailContato,
    whatsapp: loja.whatsapp,
    cidade: loja.cidade,
    estado: loja.estado,
    criadaEm: loja.created_at ?? new Date().toISOString(),
  };

  await Promise.all([
    (async () => {
      const { enviado, erro } = await enviarEmail({
        to: EMAIL_ADMIN_NOVA_LOJA,
        subject: ASSUNTO_NOVA_LOJA,
        text: textoEmailNovaSolicitacaoLoja(dados),
        html: templateNovaSolicitacaoLoja(dados),
      });
      if (!enviado) {
        Sentry.captureMessage("Aviso de nova loja: e-mail não enviado", {
          level: "error",
          tags: tags("email"),
          extra: { lojaId, erro },
        });
      }
    })(),
    (async () => {
      const numero = normalizeWhatsapp(process.env.ADMIN_WHATSAPP_NOVA_LOJA);
      if (!numero) {
        Sentry.captureMessage("Aviso de nova loja: ADMIN_WHATSAPP_NOVA_LOJA ausente", {
          level: "warning",
          tags: tags("whatsapp"),
        });
        return;
      }
      const r = await enviarBubblewhats(numero, mensagemNovaSolicitacaoLoja(dados));
      if (!r.ok) {
        Sentry.captureMessage("Aviso de nova loja: WhatsApp não enviado", {
          level: r.motivo === "nao_configurado" ? "warning" : "error",
          tags: tags("whatsapp"),
          extra: { lojaId, motivo: r.motivo, status: r.status },
        });
      }
    })(),
  ]);
}
