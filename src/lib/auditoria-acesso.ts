import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

// Registra em auditoria_eventos uma tentativa de acesso a painel sem o papel
// exigido (RPC registrar_acesso_negado, migration 0153). Chamado pelos
// layout.tsx de admin/seller/afiliado/parceiro logo antes do redirect de
// papel — nunca antes do redirect de "sem sessão". Falha da RPC vai pro
// Sentry mas NÃO bloqueia o redirect: é trilha, não gate.
export async function registrarAcessoNegado({
  rota,
  papelEsperado,
}: {
  rota: string;
  papelEsperado: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC fora dos tipos gerados
    const { error } = await (supabase as any).rpc("registrar_acesso_negado", {
      p_rota: rota,
      p_papel: papelEsperado,
    });
    if (error) {
      Sentry.captureException(error, {
        tags: { area: "auth", step: "registrar_acesso_negado" },
      });
    }
  } catch (erro) {
    Sentry.captureException(erro, {
      tags: { area: "auth", step: "registrar_acesso_negado" },
    });
  }
}
