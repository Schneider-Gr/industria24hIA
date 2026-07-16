"use client";

import { ImageUpload } from "@/components/ImageUpload";
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
      pathPrefix={lojaId}
      currentUrl={currentUrl}
      label="imagem"
      onUploaded={(url) => anexarImagemProduto(produtoId, url)}
    />
  );
}
