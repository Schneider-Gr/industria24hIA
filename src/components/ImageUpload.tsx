"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validarImagem } from "@/lib/validacao-imagem";

type ImageUploadProps = {
  bucket: "produtos" | "lojas" | "marketplace";
  pathPrefix: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void | Promise<void>;
  label: string;
};

// Upload direto pro Supabase Storage a partir do browser (client component
// já autenticado — RLS de storage.objects valida o path <pathPrefix>/... via
// dono da loja (produtos/lojas, migration 0051) ou admin (marketplace,
// migration 0054). Sem lib nova: input file + client Supabase já instalado.
export function ImageUpload({ bucket, pathPrefix, currentUrl, onUploaded, label }: ImageUploadProps) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  async function aoSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);

    const erroValidacao = validarImagem(arquivo);
    if (erroValidacao) {
      setErro(erroValidacao);
      e.target.value = "";
      return;
    }

    setEnviando(true);

    const supabase = createClient();
    const ext = arquivo.name.split(".").pop() || "jpg";
    const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, arquivo, {
      cacheControl: "3600",
      upsert: false,
    });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setPreview(data.publicUrl);
    await onUploaded(data.publicUrl);
  }

  return (
    <div className="flex items-center gap-3">
      {preview ? (
        <img src={preview} alt={label} className="h-14 w-14 rounded object-cover border border-line" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded border border-dashed border-line text-[10px] text-muted">
          sem imagem
        </div>
      )}
      <label className="cursor-pointer rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 hover:bg-surface">
        {enviando ? "Enviando..." : `Enviar ${label}`}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={aoSelecionar}
          disabled={enviando}
        />
      </label>
      {erro && <span className="text-xs text-erro">{erro}</span>}
    </div>
  );
}
