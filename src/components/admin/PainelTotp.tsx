"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  iniciarEnrollTotp,
  confirmarEnrollTotp,
  desativarTotp,
} from "@/app/(admin)/admin/perfil/seguranca/actions";

type Enroll = { factorId: string; qrCode: string; secret: string };

export function PainelTotp({ fatorAtivo }: { fatorAtivo: { id: string } | null }) {
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function iniciar() {
    setErro(null);
    start(async () => {
      try {
        const r = await iniciarEnrollTotp();
        setEnroll(r);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao iniciar 2FA.");
      }
    });
  }

  function confirmar() {
    if (!enroll) return;
    setErro(null);
    start(async () => {
      try {
        await confirmarEnrollTotp(enroll.factorId, codigo);
        setEnroll(null);
        setCodigo("");
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao confirmar código.");
      }
    });
  }

  function desativar() {
    if (!fatorAtivo) return;
    setErro(null);
    start(async () => {
      try {
        await desativarTotp(fatorAtivo.id);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao desativar.");
      }
    });
  }

  if (fatorAtivo) {
    return (
      <div className="rounded border border-line p-4">
        <p className="text-sm text-ok">2FA ativado nesta conta.</p>
        <button
          type="button"
          disabled={pending}
          onClick={desativar}
          className="mt-3 rounded border border-erro px-3 py-1.5 text-xs font-semibold text-erro disabled:opacity-40"
        >
          Desativar 2FA
        </button>
        {erro && <p className="mt-2 text-xs text-erro">{erro}</p>}
      </div>
    );
  }

  if (enroll) {
    return (
      <div className="rounded border border-line p-4">
        <p className="mb-2 text-sm">Escaneie com um app autenticador (Google Authenticator, Authy):</p>
        <img src={enroll.qrCode} alt="QR code TOTP" className="mb-2 h-40 w-40" />
        <p className="mb-3 break-all text-xs text-ink-2">Ou digite manualmente: {enroll.secret}</p>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Código de 6 dígitos"
          className="mb-2 w-full rounded border border-line bg-transparent p-2 text-sm"
        />
        <button
          type="button"
          disabled={pending || codigo.length !== 6}
          onClick={confirmar}
          className="rounded bg-ok px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          Confirmar
        </button>
        {erro && <p className="mt-2 text-xs text-erro">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="rounded border border-line p-4">
      <p className="mb-3 text-sm text-ink-2">
        2FA é opcional. Recomendado dado o poder de editar qualquer loja, produto ou pedido.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={iniciar}
        className="rounded bg-aco-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
      >
        Ativar 2FA
      </button>
      {erro && <p className="mt-2 text-xs text-erro">{erro}</p>}
    </div>
  );
}
