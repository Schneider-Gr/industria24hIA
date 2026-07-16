"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/ImageUpload";
import {
  anexarImagemProdutoAdmin,
  excluirImagemProduto,
  reordenarImagens,
} from "@/app/(admin)/admin/produtos/[id]/actions";

type Imagem = { id: string; url: string };

export function GaleriaProdutoAdmin({
  produtoId,
  lojaId,
  imagensIniciais,
}: {
  produtoId: string;
  lojaId: string;
  imagensIniciais: Imagem[];
}) {
  const [imagens, setImagens] = useState(imagensIniciais);
  const [pending, start] = useTransition();
  const router = useRouter();

  function mover(index: number, direcao: -1 | 1) {
    const alvo = index + direcao;
    if (alvo < 0 || alvo >= imagens.length) return;
    const nova = [...imagens];
    [nova[index], nova[alvo]] = [nova[alvo], nova[index]];
    setImagens(nova);
    start(() => reordenarImagens(produtoId, nova.map((img) => img.id)));
  }

  function excluir(id: string) {
    setImagens((atual) => atual.filter((img) => img.id !== id));
    const fd = new FormData();
    fd.set("id", id);
    fd.set("produtoId", produtoId);
    start(() => excluirImagemProduto(fd));
  }

  return (
    <div className="space-y-4">
      {imagens.length === 0 ? (
        <p className="text-sm text-ink-2">Nenhuma imagem cadastrada.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {imagens.map((img, i) => (
            <li key={img.id} className="space-y-1.5 rounded border border-line p-2">
              <img src={img.url} alt="" className="h-28 w-full rounded object-cover" />
              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={pending || i === 0}
                    onClick={() => mover(i, -1)}
                    className="rounded border border-line px-1.5 py-0.5 text-xs disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={pending || i === imagens.length - 1}
                    onClick={() => mover(i, 1)}
                    className="rounded border border-line px-1.5 py-0.5 text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => excluir(img.id)}
                  className="rounded bg-erro px-1.5 py-0.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ImageUpload
        bucket="produtos"
        pathPrefix={lojaId}
        label="imagem"
        onUploaded={async (url) => {
          await anexarImagemProdutoAdmin(produtoId, url);
          router.refresh();
        }}
      />
    </div>
  );
}
