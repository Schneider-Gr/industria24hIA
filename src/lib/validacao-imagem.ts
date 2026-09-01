export const TAMANHO_MAXIMO_IMAGEM_BYTES = 5 * 1024 * 1024; // 5MB — mesmo teto de disputa-mediacao-upload.ts
export const TIPOS_IMAGEM_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

/**
 * Validação pura de tamanho/MIME de imagem, reaproveitável em client e
 * server. `accept="image/*"` no `<input>` é só dica de UI — quem bloqueia de
 * verdade é isto (client) + `file_size_limit`/`allowed_mime_types` do bucket
 * (server, não contornável).
 */
export function validarImagem(arquivo: { size: number; type: string }): string | null {
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_BYTES) {
    return "Imagem maior que 5MB — reduza o tamanho e tente de novo.";
  }
  if (!TIPOS_IMAGEM_ACEITOS.includes(arquivo.type)) {
    return "Formato de imagem não suportado — use JPG, PNG ou WEBP.";
  }
  return null;
}

/**
 * Confere os primeiros bytes do arquivo contra a assinatura (magic bytes) de
 * JPG/PNG/WEBP/GIF. O `Content-Type` que o cliente declara é forjável — um
 * `.exe` renomeado `foto.jpg` com header `image/jpeg` passa por `validarImagem`
 * mas não por aqui. Uso server-side, antes de `storage.upload`.
 */
export async function validarConteudoImagem(arquivo: Blob): Promise<string | null> {
  const b = [...new Uint8Array(await arquivo.slice(0, 12).arrayBuffer())];
  const casa = (assinatura: number[], offset = 0) => assinatura.every((x, i) => b[offset + i] === x);
  const imagem =
    casa([0xff, 0xd8, 0xff]) || // JPEG
    casa([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) || // PNG
    (casa([0x52, 0x49, 0x46, 0x46]) && casa([0x57, 0x45, 0x42, 0x50], 8)) || // RIFF....WEBP
    casa([0x47, 0x49, 0x46, 0x38]); // GIF87a/89a
  return imagem ? null : "Arquivo enviado não é uma imagem válida (JPG, PNG, WEBP ou GIF).";
}

/** Checagem server-side completa: tamanho + MIME declarado + magic bytes. */
export async function validarImagemUpload(arquivo: File): Promise<string | null> {
  return validarImagem(arquivo) ?? (await validarConteudoImagem(arquivo));
}
