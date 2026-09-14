// Narração dos passos do tour pela síntese de voz do próprio navegador
// (spec `seller-ajuda-contextual/tour-narrado`). Sem arquivo de áudio e sem
// serviço externo: o texto do passo continua sendo a única fonte, então mudar
// um passo do tour muda a narração junto.
//
// A escolha da voz é separada do componente porque é a única parte com regra
// de verdade — e a única testável sem DOM.

/** Só o que precisamos de `SpeechSynthesisVoice`, para o teste não simular a API inteira. */
export type VozDisponivel = { lang: string; name: string; default?: boolean };

/**
 * Melhor voz em português para a narração, ou `null` quando não há nenhuma.
 * Prefere pt-BR sobre pt-PT (o seller é brasileiro) e, dentro do mesmo idioma,
 * a voz padrão do sistema, que costuma ser a de melhor qualidade instalada.
 */
export function escolherVoz<T extends VozDisponivel>(vozes: readonly T[]): T | null {
  const porIdioma = (prefixo: string) =>
    vozes.filter((v) => v.lang?.toLowerCase().replace("_", "-").startsWith(prefixo));

  const candidatas = porIdioma("pt-br").length ? porIdioma("pt-br") : porIdioma("pt");
  if (candidatas.length === 0) return null;

  return candidatas.find((v) => v.default) ?? candidatas[0];
}

/** `true` quando vale oferecer o botão de ouvir: sem voz em português, não vale. */
export function podeNarrar(vozes: readonly VozDisponivel[] | undefined): boolean {
  return vozes != null && escolherVoz(vozes) != null;
}
