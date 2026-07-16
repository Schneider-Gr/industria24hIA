"use client";

import { ImageUpload } from "@/components/seller/ImageUpload";
import { anexarImagemProduto } from "@/app/(seller)/seller/produtos/actions";

export function ProdutoImagemCell({
  produtoId,
  lojaId,
  currentUrl,
}: {
  produtoId: string;
  lojaId: string;
  currentUrl?: string | null;
}) {
  return (
    <ImageUpload
      bucket="produtos"
      lojaId={lojaId}
      currentUrl={currentUrl}
      label="imagem"
      onUploaded={(url) => anexarImagemProduto(produtoId, url)}
    />
  );
}
