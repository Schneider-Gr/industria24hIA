// Expansão das faixas usadas no cadastro em lote de posições de armazenagem
// (US02 do PRD 039). Lógica pura, sem IO: o servidor valida com a mesma função
// que a tela usa para mostrar a prévia, então o número que a pessoa vê antes de
// gravar é o mesmo que o banco vai criar.

/** Teto por lote. Galpão real raramente passa disso, e o limite evita que um
 *  "1-99999" digitado por engano vire uma transação de meia hora. */
export const MAX_POSICOES_POR_LOTE = 2000;

/** Faixa cujo tamanho estoura o teto antes mesmo de ser materializada. */
export class FaixaGrandeDemais extends Error {}

/** Parte que não pode virar segmento de código de posição. */
export class ParteInvalida extends Error {}

/**
 * Expande uma entrada em lista de partes. Aceita, separados por vírgula:
 * - valores soltos: `A`, `DOCA`
 * - faixas numéricas: `1-10`
 * - faixas de letra única: `A-C`
 *
 * Tudo em maiúsculas, porque o `codigo` da posição é gerado em maiúsculas pelo
 * banco: aceitar `a` e `A` como coisas diferentes na tela criaria dois nomes
 * para a mesma posição, que é exatamente o que a coluna gerada evita.
 */
export function expandirFaixa(entrada: string): string[] {
  const partes: string[] = [];

  for (const bruto of entrada.split(",")) {
    const termo = bruto.trim().toUpperCase();
    if (termo === "") continue;

    const numerica = termo.match(/^(\d+)\s*-\s*(\d+)$/);
    if (numerica) {
      const [ini, fim] = [Number(numerica[1]), Number(numerica[2])];
      // Faixa invertida é erro de digitação, não intenção de lista vazia.
      const [de, ate] = ini <= fim ? [ini, fim] : [fim, ini];
      // O tamanho é conferido ANTES de materializar. Sem isto, `1-999999999`
      // aloca um bilhão de strings e derruba o processo antes de qualquer
      // validação de teto ou de sessão — e, na tela, a prévia roda a cada
      // tecla, então a aba congela na sétima digitada.
      if (ate - de + 1 > MAX_POSICOES_POR_LOTE) {
        throw new FaixaGrandeDemais(
          `A faixa ${de}-${ate} sozinha já tem ${ate - de + 1} valores, acima do limite de ${MAX_POSICOES_POR_LOTE}.`,
        );
      }
      for (let n = de; n <= ate; n++) partes.push(String(n));
      continue;
    }

    const alfabetica = termo.match(/^([A-Z])\s*-\s*([A-Z])$/);
    if (alfabetica) {
      const [ini, fim] = [alfabetica[1].charCodeAt(0), alfabetica[2].charCodeAt(0)];
      const [de, ate] = ini <= fim ? [ini, fim] : [fim, ini];
      for (let c = de; c <= ate; c++) partes.push(String.fromCharCode(c));
      continue;
    }

    // Hífen dentro de uma parte literal quebra a unicidade da posição: o
    // `codigo` do banco é `rua-predio-nivel-apartamento`, então a rua `AA-BB`
    // com prédio `CC` e a rua `AA` com prédio `BB-CC` geram o mesmo
    // `AA-BB-CC-1-1`. São dois nomes para a mesma posição, exatamente o que a
    // coluna gerada existe para impedir, e o `on conflict` engoliria a segunda
    // dizendo que já existia.
    if (termo.includes("-")) {
      throw new ParteInvalida(
        `"${termo}" não pode conter hífen: o hífen separa as partes do código da posição.`,
      );
    }

    partes.push(termo);
  }

  // Repetição vira uma posição só: o índice único do banco recusaria a segunda
  // de qualquer jeito, e a prévia mentiria se contasse as duas.
  //
  // Ordena para que a prévia não diga "de C-1-1-1 até A-1-1-1" quando alguém
  // digita `C,A`, o que se lê como erro. Número compara como número, senão
  // `10` viria antes de `2`. O banco ordena por texto, mas lá a ordem serve
  // só para travar as linhas sempre na mesma sequência: o conjunto criado é o
  // mesmo, e as duas ordens não precisam coincidir.
  return [...new Set(partes)].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b, "pt-BR");
  });
}

export type Posicao = {
  rua: string;
  predio: string;
  nivel: string;
  apartamento: string;
  codigo: string;
};

export type ResultadoExpansao =
  | { ok: true; posicoes: Posicao[] }
  | { ok: false; erro: string };

/** Produto cartesiano das quatro faixas, na mesma ordem do `codigo` gerado. */
export function gerarPosicoes(faixas: {
  ruas: string;
  predios: string;
  niveis: string;
  apartamentos: string;
}): ResultadoExpansao {
  let ruas: string[], predios: string[], niveis: string[], apartamentos: string[];
  try {
    ruas = expandirFaixa(faixas.ruas);
    predios = expandirFaixa(faixas.predios);
    niveis = expandirFaixa(faixas.niveis);
    apartamentos = expandirFaixa(faixas.apartamentos);
  } catch (e) {
    // Entrada inválida é resposta de negócio, não exceção: quem chama mostra o
    // motivo na tela, e a prévia continua funcionando enquanto a pessoa digita.
    if (e instanceof FaixaGrandeDemais || e instanceof ParteInvalida) {
      return { ok: false, erro: e.message };
    }
    throw e;
  }

  const vazio = [
    ["rua", ruas],
    ["prédio", predios],
    ["nível", niveis],
    ["apartamento", apartamentos],
  ].find(([, lista]) => (lista as string[]).length === 0);
  if (vazio) {
    return { ok: false, erro: `Informe ao menos um valor para ${vazio[0]}.` };
  }

  const total = ruas.length * predios.length * niveis.length * apartamentos.length;
  if (total > MAX_POSICOES_POR_LOTE) {
    return {
      ok: false,
      erro: `Este lote geraria ${total} posições, acima do limite de ${MAX_POSICOES_POR_LOTE}. Divida em lotes menores.`,
    };
  }

  const posicoes: Posicao[] = [];
  for (const rua of ruas)
    for (const predio of predios)
      for (const nivel of niveis)
        for (const apartamento of apartamentos)
          posicoes.push({
            rua,
            predio,
            nivel,
            apartamento,
            codigo: `${rua}-${predio}-${nivel}-${apartamento}`,
          });

  return { ok: true, posicoes };
}
