// Contato comercial único do site. Estava escrito à mão em cada landing page
// (armazeneconosco, venda-no-industria, seja-parceiro/agregados) e mudou em
// 23/09/2026; centralizado para a próxima troca ser em um lugar só.
export const WHATSAPP_NUMERO = "5511910483048";
export const WHATSAPP_EXIBICAO = "+55 11 91048-3048";

/** Link do WhatsApp com mensagem já preenchida. */
export function whatsappHref(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}
