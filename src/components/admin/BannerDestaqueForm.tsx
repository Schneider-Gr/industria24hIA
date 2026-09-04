"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";

type BannerDestaqueFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  id?: string;
  titulo?: string;
  imagemUrl?: string;
  href?: string;
  badge?: string;
  ordem?: number;
  ativo?: boolean;
  posicao?: string;
  submitLabel: string;
};

const inputCls =
  "w-full rounded border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-aco-600 dark:border-line dark:bg-surface";

// Cria e edita um banner da faixa "Destaques da Indústria" (topo da home).
// Upload direto pro bucket 'marketplace' (migration 0056), mesmo padrão do
// MarketplaceBannerForm — só troca o pathPrefix.
export function BannerDestaqueForm({
  action,
  id,
  titulo = "",
  imagemUrl = "",
  href = "",
  badge = "",
  ordem = 0,
  ativo = true,
  posicao = "topo",
  submitLabel,
}: BannerDestaqueFormProps) {
  const [imagem, setImagem] = useState(imagemUrl);

  return (
    <form action={action} className="space-y-3">
      {id && <input type="hidden" name="id" value={id} />}

      <div>
        <span className="mb-1 block text-xs font-medium text-ink-2">Imagem — 16:9</span>
        <input type="hidden" name="imagem_url" value={imagem} required />
        <ImageUpload
          bucket="marketplace"
          pathPrefix="destaques"
          currentUrl={imagem}
          label="banner"
          onUploaded={setImagem}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Título</span>
          <input name="titulo" defaultValue={titulo} required className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Link (href)</span>
          <input name="href" defaultValue={href} required className={inputCls} placeholder="/leilao ou #mercado-futuro" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Posição na home</span>
          <select name="posicao" defaultValue={posicao} className={inputCls}>
            <option value="topo">Destaques da indústria (depois do Supermercado)</option>
            <option value="meio">Ofertas em destaque (antes do Supermercado)</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Badge (opcional)</span>
          <input name="badge" defaultValue={badge} className={inputCls} placeholder="Novo" />
        </label>
        {id && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-2">Ordem</span>
            <input
              name="ordem"
              type="number"
              defaultValue={ordem}
              className={inputCls}
            />
          </label>
        )}
      </div>

      {id && (
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" name="ativo" defaultChecked={ativo} className="h-4 w-4" />
          Ativo (visível na home)
        </label>
      )}

      <button
        type="submit"
        className="rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro"
      >
        {submitLabel}
      </button>
    </form>
  );
}
