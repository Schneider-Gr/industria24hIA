import { createServiceClient, isServiceConfigured } from "../supabase/service";

export type ObservabilidadeCapability =
  | "cron"
  | "checkout"
  | "webhook_asaas"
  | "agente_ia"
  | "rls"
  | "integracao_terceiro"
  | "rate_limit"
  | "migration_drift";

export type ObservabilidadeResultado = "sucesso" | "falha" | "alerta";

export interface RegistrarEventoInput {
  capability: ObservabilidadeCapability;
  origem: string;
  resultado: ObservabilidadeResultado;
  motivo?: string;
  metadata?: Record<string, unknown>;
}

// Não bloqueante por design: falha ao registrar o evento nunca deve
// interromper o fluxo principal que está sendo observado (ver spec
// observabilidade-checkout-financeiro, "Alerta não bloqueia a transação").
export async function registrarEvento(input: RegistrarEventoInput): Promise<void> {
  if (!isServiceConfigured) {
    console.error("[observabilidade] SUPABASE_SERVICE_ROLE_KEY não configurada", input);
    return;
  }

  try {
    const svc = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0125 fora dos tipos gerados
    const { error } = await (svc as any).from("observabilidade_eventos").insert({
      capability: input.capability,
      origem: input.origem,
      resultado: input.resultado,
      motivo: input.motivo ?? null,
      metadata: input.metadata ?? null,
    });
    if (error) {
      console.error("[observabilidade] falha ao registrar evento", error.message, input);
    }
  } catch (e) {
    console.error(
      "[observabilidade] exceção ao registrar evento",
      e instanceof Error ? e.message : e,
      input,
    );
  }
}
