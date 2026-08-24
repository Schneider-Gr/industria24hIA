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
