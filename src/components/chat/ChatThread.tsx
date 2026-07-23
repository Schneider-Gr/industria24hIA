"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { enviarMensagem, marcarLidas, type EnviarMensagemState } from "@/app/mensagens/actions";
import type { Tables } from "@/lib/supabase/database.types";

type Mensagem = Pick<Tables<"mensagens">, "id" | "autor_id" | "corpo" | "created_at">;

// Thread de chat em tempo real. Mensagens novas chegam via Supabase Realtime
// (INSERT em `mensagens`, RLS vale para o stream); o envio passa pela server
// action. Dedupe por id porque o próprio INSERT do usuário também chega no canal.
export function ChatThread({
  conversaId,
  userId,
  mensagensIniciais,
}: {
  conversaId: string;
  userId: string;
  mensagensIniciais: Mensagem[];
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>(mensagensIniciais);
  const [state, action, pending] = useActionState<EnviarMensagemState, FormData>(
    enviarMensagem,
    { ok: true },
  );
  const fimRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    marcarLidas(conversaId);
    const supabase = createClient();
    const canal = supabase
      .channel(`conversa-${conversaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens",
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          const nova = payload.new as Mensagem;
          setMensagens((atual) =>
            atual.some((m) => m.id === nova.id) ? atual : [...atual, nova],
          );
          if (nova.autor_id !== userId) marcarLidas(conversaId);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [conversaId, userId]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
    if (state.ok && !pending) formRef.current?.reset();
  }, [mensagens.length, state.ok, pending]);

  return (
    <div className="flex h-[60vh] flex-col rounded border border-line bg-white">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {mensagens.length === 0 && (
          <p className="text-center text-sm text-muted">
            Nenhuma mensagem ainda. Envie a primeira pergunta.
          </p>
        )}
        {mensagens.map((m) => {
          const minha = m.autor_id === userId;
          return (
            <div key={m.id} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  minha ? "bg-aco-900 text-white" : "bg-surface text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.corpo}</p>
                <p className={`mt-1 text-[10px] ${minha ? "text-white/60" : "text-muted"}`}>
                  {new Date(m.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={fimRef} />
      </div>
      <form ref={formRef} action={action} className="flex gap-2 border-t border-line p-3">
        <input type="hidden" name="conversa_id" value={conversaId} />
        <textarea
          name="corpo"
          rows={1}
          required
          maxLength={4000}
          placeholder="Escreva sua mensagem…"
          className="flex-1 resize-none rounded border border-line px-3 py-2 text-sm focus:border-aco-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Enviar"}
        </button>
      </form>
      {!state.ok && state.erro && (
        <p className="border-t border-line px-3 py-2 text-xs text-erro">{state.erro}</p>
      )}
    </div>
  );
}
