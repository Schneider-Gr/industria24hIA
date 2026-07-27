"use client";

import { useState, useTransition } from "react";
import { banirUsuario, desbanirUsuario, resetarSenhaUsuario } from "@/app/(admin)/admin/usuarios/actions";

// Ban/desban (Admin API do GoTrue via service_role) e reset de senha
// (resetPasswordForEmail, fluxo público). Ban exige motivo — auditado.
export function AcoesUsuario({
  userId,
  email,
  banido,
  podeBanir,
}: {
  userId: string;
  email: string;
  banido: boolean;
  podeBanir: boolean;
}) {
  const [motivo, setMotivo] = useState("");
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirmarBan() {
    if (!motivo.trim()) {
      setErro("Descreva o motivo.");
      return;
    }
    setErro(null);
    const fd = new FormData();
    fd.set("user_id", userId);
    fd.set("motivo", motivo);
    start(async () => {
      try {
        await banirUsuario(fd);
        setMotivo("");
        setAberto(false);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao banir.");
      }
    });
  }

  function desbanir() {
    setErro(null);
    const fd = new FormData();
    fd.set("user_id", userId);
    start(async () => {
      try {
        await desbanirUsuario(fd);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao desbanir.");
      }
    });
  }

  function resetarSenha() {
    setErro(null);
    setOk(null);
    const fd = new FormData();
    fd.set("email", email);
    start(async () => {
      try {
        await resetarSenhaUsuario(fd);
        setOk("E-mail de redefinição enviado.");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao enviar reset de senha.");
      }
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {podeBanir &&
          (banido ? (
            <button
              type="button"
              disabled={pending}
              onClick={desbanir}
              className="rounded border border-line px-2 py-1 text-xs disabled:opacity-40"
            >
              Desbanir
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setAberto((v) => !v)}
              className="rounded border border-erro px-2 py-1 text-xs font-semibold text-erro disabled:opacity-40"
            >
              Banir
            </button>
          ))}
        <button
          type="button"
          disabled={pending}
          onClick={resetarSenha}
          className="rounded border border-line px-2 py-1 text-xs disabled:opacity-40"
        >
          Reset senha
        </button>
      </div>
      {aberto && !banido && (
        <div className="space-y-1">
          <textarea
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (obrigatório)"
            className="w-44 rounded border border-line bg-transparent p-1.5 text-xs"
          />
          <button
            type="button"
            disabled={pending}
            onClick={confirmarBan}
            className="rounded bg-erro px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
          >
            Confirmar ban
          </button>
        </div>
      )}
      {erro && <p className="text-xs text-erro">{erro}</p>}
      {ok && <p className="text-xs text-ok">{ok}</p>}
    </div>
  );
}
