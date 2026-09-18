"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validarImagem } from "@/lib/validacao-imagem";
import { ImageUpload } from "@/components/ImageUpload";
import type { BannerSlide } from "@/components/vitrine/BannerCarousel";

// Galeria do carousel da home: sobe várias imagens de uma vez (cada uma vira
// um slide) e, por slide, troca versão mobile, texto, link e ordem.
// Upload pro bucket 'marketplace' (admin-only, migration 0054).
export function MarketplaceBannerForm({
  action,
  slides: iniciais,
}: {
  action: (formData: FormData) => void | Promise<void>;
  slides: BannerSlide[];
}) {
  const [slides, setSlides] = useState<BannerSlide[]>(iniciais);
  const [enviando, setEnviando] = useState(0);
  const [erros, setErros] = useState<string[]>([]);
  const [status, setStatus] = useState<"" | "salvando" | "salvo" | string>("");

  async function salvar(fd: FormData) {
    setStatus("salvando");
    try {
      await action(fd);
      setStatus("salvo");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  }

  const alterar = (i: number, campo: Partial<BannerSlide>) =>
    setSlides((s) => s.map((b, j) => (j === i ? { ...b, ...campo } : b)));
  const mover = (i: number, d: -1 | 1) =>
    setSlides((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const n = [...s];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  async function aoSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!arquivos.length) return;
    const supabase = createClient();
    const falhas: string[] = [];
    setEnviando(arquivos.length);
    for (const arquivo of arquivos) {
      const invalido = validarImagem(arquivo);
      try {
        if (invalido) {
          falhas.push(`${arquivo.name}: ${invalido}`);
        } else {
          const ext = arquivo.name.split(".").pop() || "jpg";
          const path = `home/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage
            .from("marketplace")
            .upload(path, arquivo, { cacheControl: "3600", upsert: false });
          if (error) {
            falhas.push(`${arquivo.name}: ${error.message}`);
          } else {
            const src = supabase.storage.from("marketplace").getPublicUrl(path).data.publicUrl;
            setSlides((s) => [...s, { src, alt: "" }]);
          }
        }
      } catch (e) {
        // Sem isso o contador nunca zera e o botão Salvar fica travado.
        falhas.push(`${arquivo.name}: ${e instanceof Error ? e.message : "falha no envio"}`);
      } finally {
        setEnviando((n) => n - 1);
      }
    }
    setErros(falhas);
  }

  return (
    <form action={salvar} className="space-y-4">
      <input type="hidden" name="banners_hero" value={JSON.stringify(slides)} />

      <label className="inline-block cursor-pointer rounded border border-line px-3 py-2 text-sm font-semibold text-ink-2 hover:bg-surface">
        {enviando ? `Enviando ${enviando}...` : "Adicionar imagens (várias de uma vez)"}
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={aoSelecionar}
          disabled={enviando > 0}
        />
      </label>
      {erros.map((m) => (
        <p key={m} className="text-xs text-erro">
          {m}
        </p>
      ))}

      {slides.length === 0 && (
        <p className="text-sm text-muted">Nenhum slide: a home mostra o banner padrão.</p>
      )}

      <ol className="space-y-3">
        {slides.map((b, i) => (
          <li key={`${b.src}-${i}`} className="space-y-2 rounded border border-line p-3">
            <div className="flex items-start gap-3">
              <img src={b.src} alt={b.alt} className="h-16 w-48 rounded border border-line object-cover" />
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-semibold">Slide {i + 1}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="rounded border border-line px-2 disabled:opacity-40" aria-label="Subir">
                    ↑
                  </button>
                  <button type="button" onClick={() => mover(i, 1)} disabled={i === slides.length - 1} className="rounded border border-line px-2 disabled:opacity-40" aria-label="Descer">
                    ↓
                  </button>
                  <button type="button" onClick={() => setSlides((s) => s.filter((_, j) => j !== i))} className="rounded border border-line px-2 text-erro">
                    Remover
                  </button>
                </div>
              </div>
            </div>
            <div className="text-xs">
              <span className="mb-1 block font-medium">Versão mobile (opcional) — 892×817</span>
              <ImageUpload
                bucket="marketplace"
                pathPrefix="home"
                currentUrl={b.srcMobile}
                label="mobile"
                onUploaded={(url) => alterar(i, { srcMobile: url })}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={b.alt}
                onChange={(e) => alterar(i, { alt: e.target.value })}
                placeholder="Texto alternativo"
                className="rounded border border-line px-2 py-1 text-sm"
              />
              <input
                value={b.href ?? ""}
                onChange={(e) => alterar(i, { href: e.target.value || undefined })}
                placeholder="Link (/produtos, #secao ou https://...)"
                className="rounded border border-line px-2 py-1 text-sm"
              />
            </div>
          </li>
        ))}
      </ol>

      <button
        type="submit"
        disabled={enviando > 0 || status === "salvando"}
        className="rounded bg-sinal px-4 py-2 text-sm font-semibold text-white hover:bg-sinal-escuro disabled:opacity-50"
      >
        {status === "salvando" ? "Salvando..." : "Salvar galeria"}
      </button>
      {status === "salvo" && (
        <p className="text-sm font-semibold text-green-700">Galeria salva. A home já mostra os slides novos.</p>
      )}
      {status && status !== "salvo" && status !== "salvando" && (
        <p className="text-sm text-erro">{status}</p>
      )}
    </form>
  );
}
