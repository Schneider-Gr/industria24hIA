"use client";

import { useState, useTransition } from "react";
import { registrarCuradoria } from "@/app/(admin)/admin/produtos/[id]/actions";

// Parecer + decisão num único envio: o motivo é obrigatório para reprovar ou
// sugerir ajustes (a action revalida isso no servidor).
type ParecerSugerido = { decisaoSugerida: string | null; texto: string };

export function CuradoriaProduto({
  produtoId,
  sellerTemEmail,
  parecerSugerido,
}: {
  produtoId: string;
  sellerTemEmail: boolean;
  parecerSugerido?: ParecerSugerido | null;
}) {
  const [observacao, setObservacao] = useState(parecerSugerido?.texto ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function decidir(decisao: "aprovado" | "reprovado" | "sugestao") {
    setErro(null);
    // Mesma regra da server action, repetida aqui só pela mensagem: erro lançado
    // em Server Action chega ao client redigido em produção ("An error occurred
    // in the Server Components render"), inútil pro admin.
    if (decisao !== "aprovado" && !observacao.trim()) {
      setErro("Descreva o motivo para reprovar ou sugerir ajustes.");
      return;
    }
    const fd = new FormData();
    fd.set("produtoId", produtoId);
    fd.set("decisao", decisao);
    fd.set("observacao", observacao);
    start(async () => {
      try {
        await registrarCuradoria(fd);
        setObservacao("");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao registrar curadoria.");
      }
    });
  }

  const btn = "rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40";

  const rotuloSugerido: Record<string, string> = {
    aprovado: "Aprovar",
    reprovado: "Reprovar",
    sugestao: "Sugerir ajustes",
  };

  return (
    <div className="rounded border border-line p-4">
      {parecerSugerido && (
        <p className="mb-2 text-xs text-ink-2">
          Sugestão da curadoria por IA
          {parecerSugerido.decisaoSugerida &&
            `: ${rotuloSugerido[parecerSugerido.decisaoSugerida] ?? parecerSugerido.decisaoSugerida}`}
          . Revise o texto abaixo antes de confirmar.
        </p>
      )}
      <label htmlFor="obs" className="mb-1 block text-xs text-ink-2">
        Parecer para o vendedor (obrigatório ao reprovar ou sugerir)
      </label>
      <textarea
        id="obs"
        rows={4}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        placeholder="Ex.: fotos com marca d'água de terceiros; descrição sem dimensões do produto."
        className="w-full rounded border border-line bg-transparent p-2 text-sm text-ink"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => decidir("aprovado")} className={`${btn} bg-ok hover:bg-ok/90`}>
          Aprovar
        </button>
        <button type="button" disabled={pending} onClick={() => decidir("sugestao")} className={`${btn} bg-aco-600 hover:bg-aco-600/90`}>
          Sugerir ajustes
        </button>
        <button type="button" disabled={pending} onClick={() => decidir("reprovado")} className={`${btn} bg-erro hover:bg-erro/90`}>
          Reprovar
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-2">
        {sellerTemEmail
          ? "O vendedor recebe a decisão e o parecer por e-mail."
          : "Esta loja não tem e-mail cadastrado: a decisão é registrada, mas o vendedor NÃO será notificado."}
      </p>
      {erro && <p className="mt-2 text-xs text-erro">{erro}</p>}
    </div>
  );
}
