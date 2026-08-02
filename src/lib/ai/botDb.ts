import type { createServiceClient } from "@/lib/supabase/service";
import type { Persona } from "./systemPrompt";

// Tipos manuais para bot_conversas/bot_mensagens/leads (migration 0088):
// ainda fora de database.types.ts, mesmo motivo do padrão já usado em
// src/app/api/asaas/webhook/route.ts (gen types exige login na conta certa,
// indisponível aqui). `unknown` explícito em vez de silenciar com `any`.
export type ServiceClient = ReturnType<typeof createServiceClient>;

export type BotConversa = {
  id: string;
  usuario_id: string | null;
  telefone: string | null;
  identificado_em: string | null;
  status: string;
  persona: Persona | null;
};

export type BotMensagem = { remetente: "usuario" | "bot"; conteudo: string };

export type Lead = {
  id: string;
  nome: string | null;
  contato: string;
  interesse: string | null;
  persona: Persona | null;
  etapa_funil: string | null;
};

type RpcResult<T> = { data: T | null; error: { message: string } | null };
type SelectResult<T> = { data: T | null; error: { message: string } | null };
type ListResult<T> = { data: T[] | null; error: { message: string } | null };

export interface ServiceClientSemTipos {
  rpc(fn: "resolver_usuario_por_contato", args: { p_contato: string }): Promise<RpcResult<string | null>>;
  from(
    table: "bot_conversas",
  ): {
    insert(values: {
      canal: "site" | "whatsapp";
      usuario_id?: string | null;
      telefone?: string | null;
    }): {
      select(cols: string): { single(): Promise<SelectResult<BotConversa>> };
    };
    select(cols: string): {
      eq(col: string, val: string): {
        eq(col: string, val: string): { maybeSingle(): Promise<SelectResult<BotConversa>> };
        maybeSingle(): Promise<SelectResult<BotConversa>>;
      };
    };
    update(values: { persona: Persona } | Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>;
    };
  };
  from(
    table: "bot_mensagens",
  ): {
    insert(values: { conversa_id: string; remetente: "usuario" | "bot"; conteudo: string }): Promise<{
      error: { message: string } | null;
    }>;
    select(cols: string): {
      eq(col: string, val: string): {
        order(col: string, opts: { ascending: boolean }): {
          limit(n: number): Promise<ListResult<BotMensagem>>;
        };
      };
    };
  };
  from(
    table: "leads",
  ): {
    insert(values: {
      conversa_id: string | null;
      nome: string | null;
      contato: string;
      interesse: string | null;
      persona: Persona | null;
      etapa_funil: string;
    }): Promise<{ error: { message: string } | null }>;
    select(cols: string): {
      eq(col: "conversa_id", val: string): { maybeSingle(): Promise<SelectResult<Lead>> };
    };
    update(values: {
      nome: string | null;
      contato: string;
      interesse: string | null;
      persona: Persona | null;
      etapa_funil: string;
    }): {
      eq(col: "id", val: string): Promise<{ error: { message: string } | null }>;
    };
  };
}

export function untyped(svc: ServiceClient): ServiceClientSemTipos {
  return svc as unknown as ServiceClientSemTipos;
}
