"use client";

import { useState } from "react";

type Mensagem = { autor: "usuario" | "bot"; texto: string };

// Bolha de chat global, visível para logado e anônimo (decisão do
// brainstorm: dúvida sobre funcionalidade não depende de conta). Estado só
// em memória do componente — persistência real fica em bot_mensagens no
// servidor, aqui é só o que renderiza na tela.
export function ChatWidget() {
  const [aberto, setAberto] = useState(false);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const mensagem = texto.trim();
    if (!mensagem || enviando) return;
    setTexto("");
    setMensagens((m) => [...m, { autor: "usuario", texto: mensagem }]);
    setEnviando(true);
    try {
      const res = await fetch("/api/bot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId, mensagem }),
      });
      const data = (await res.json()) as { conversaId?: string; resposta?: string; erro?: string };
      if (data.conversaId) setConversaId(data.conversaId);
      setMensagens((m) => [...m, { autor: "bot", texto: data.resposta ?? data.erro ?? "Erro ao responder." }]);
    } catch {
      setMensagens((m) => [...m, { autor: "bot", texto: "Falha ao conectar. Tente novamente." }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed bottom-24 right-4 z-50">
      {aberto && (
        <div className="mb-2 flex h-96 w-80 flex-col rounded-lg border border-line bg-white shadow-xl dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-sm font-semibold">Atendimento Indústria24h</span>
            <button onClick={() => setAberto(false)} aria-label="Fechar" className="text-sm">
              ×
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {mensagens.length === 0 && (
              <p className="text-ink-2">Pergunte sobre compra coletiva, venda futura, afiliados, logística...</p>
            )}
            {mensagens.map((m, i) => (
              <div
                key={i}
                className={
                  m.autor === "usuario"
                    ? "ml-auto max-w-[85%] rounded-lg bg-aco-600 px-3 py-2 text-white"
                    : "mr-auto max-w-[85%] rounded-lg bg-neutral-100 px-3 py-2 dark:bg-neutral-800"
                }
              >
                {m.texto}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void enviar();
            }}
            className="flex gap-2 border-t border-line p-2"
          >
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite sua dúvida..."
              className="flex-1 rounded border border-line px-2 py-1 text-sm"
              disabled={enviando}
            />
            <button
              type="submit"
              disabled={enviando}
              className="rounded bg-aco-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-3 text-sm font-semibold text-ink shadow-lg hover:bg-yellow-300"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {aberto ? "Fechar" : "Atendimento"}
      </button>
    </div>
  );
}
