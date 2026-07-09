/**
 * Descrições de produto migradas do Bubble trazem marcação BBCode residual
 * (`[b]`, `[h2]`, `[li indent=0 align=left]`...) que nunca foi convertida.
 * Aqui só limpamos para exibição em texto puro — não altera o dado no banco.
 */
export function limparBBCode(texto: string): string {
  return texto
    .replace(/\[\/?(ul|ml)\]/gi, "")
    .replace(/\[li[^\]]*\]/gi, "\n• ")
    .replace(/\[\/li\]/gi, "")
    .replace(/\[\/?h[1-6]\]/gi, "\n")
    .replace(/\[\/?(b|i|u)\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
