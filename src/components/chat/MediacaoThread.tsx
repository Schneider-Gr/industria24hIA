"use client";

import { useRef } from "react";

type MensagemMediacao = {
  id: string;
  autor_id: string;
  corpo: string;
  created_at: string;
  /** URL assinada já resolvida pelo server component — nunca o path bruto. */
  foto_url?: string | null;
};

// Thread do canal de mediação (admin↔comprador OU admin↔loja, nunca os
// dois juntos — ver migration 0115). Diferente de ChatThread: sem realtime,
// SSR + revalidatePath, mesmo padrão do resto dos formulários do painel;
// volume baixo (só durante mediação) não justifica o canal Realtime extra.
// Anexo de foto (0116): opcional, uma por mensagem, mesmo bucket privado +
// URL assinada das fotos de abertura de disputa.
export function MediacaoThread({
  disputaId,
  userId,
  mensagensIniciais,
  action,
  extraFields,
}: {
  disputaId: string;
  userId: string;
  mensagensIniciais: MensagemMediacao[];
  action: (formData: FormData) => void | Promise<void>;
  /** Campos ocultos extras — ex.: `destinatario` quando o admin escolhe o canal. */
  extraFields?: Record<string, string>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex max-h-[50vh] flex-col rounded border border-line bg-white">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {mensagensIniciais.length === 0 && (
          <p className="text-center text-sm text-muted">Nenhuma mensagem ainda.</p>
        )}
        {mensagensIniciais.map((m) => {
          const minha = m.autor_id === userId;
          return (
            <div key={m.id} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  minha ? "bg-aco-900 text-white" : "bg-surface text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.corpo}</p>
                {m.foto_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.foto_url}
                    alt="Foto anexada à mensagem"
                    className="mt-2 h-32 w-32 rounded object-cover"
                  />
                )}
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
      </div>
      <form
        ref={formRef}
        action={async (formData) => {
          await action(formData);
          formRef.current?.reset();
        }}
        className="flex flex-col gap-2 border-t border-line p-3"
      >
        <input type="hidden" name="disputa_id" value={disputaId} />
        {extraFields &&
          Object.entries(extraFields).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        <div className="flex gap-2">
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
            className="rounded bg-aco-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Enviar
          </button>
        </div>
        <label className="text-xs text-muted">
          Anexar foto (evidência para arbitragem)
          <input
            type="file"
            name="foto"
            accept="image/*"
            className="mt-1 block w-full text-xs"
          />
        </label>
      </form>
    </div>
  );
}
