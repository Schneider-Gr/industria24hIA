import type { Bloco, Topico } from "@/components/seller/manual-seller";

// Busca por palavra-chave na Central de Dúvidas. O manual inteiro tem menos de
// 700 linhas e já vem no bundle da página, então a busca acontece na memória
// do navegador: nada de índice, servidor ou dependência nova.
//
// ponytail: pontuação simples (título pesa mais que corpo). Se um dia o manual
// crescer a ponto de isso errar, o upgrade é um índice invertido — não uma
// biblioteca de busca.

/** Minúsculas e sem acento: "repasse" tem que achar "Repasse" e "consignação" achar "consignacao". */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function textoDoBloco(bloco: Bloco): string {
  switch (bloco.tipo) {
    case "p":
    case "subtitulo":
      return bloco.texto;
    case "passos":
    case "lista":
      return bloco.itens.join(" ");
    case "campos":
      return bloco.itens.map(([campo, desc]) => `${campo} ${desc}`).join(" ");
    case "tabela":
      return [...bloco.cabecalho, ...bloco.linhas.flat(), bloco.nota ?? ""].join(" ");
    case "aviso":
      return `${bloco.titulo} ${bloco.texto}`;
  }
}

export type Resultado = { topico: Topico; pontos: number; trecho: string };

/** Primeira frase do tópico que contém algum dos termos, para mostrar na lista. */
function trechoRelevante(corpo: string, termos: string[]): string {
  const frases = corpo.split(/(?<=[.!?])\s+/);
  const alvo = frases.find((f) => termos.some((t) => normalizar(f).includes(t)));
  const escolhida = alvo ?? frases[0] ?? "";
  return escolhida.length > 160 ? `${escolhida.slice(0, 157)}…` : escolhida;
}

/**
 * Tópicos que casam com a consulta, do mais relevante para o menos. Consulta
 * vazia devolve lista vazia, não o manual inteiro: quem não digitou nada
 * continua vendo o índice normal da página.
 */
export function buscarNoManual(topicos: readonly Topico[], consulta: string): Resultado[] {
  const termos = normalizar(consulta).split(/\s+/).filter((t) => t.length >= 3);
  if (termos.length === 0) return [];

  return topicos
    .map((topico) => {
      const corpo = topico.blocos.map(textoDoBloco).join(" ");
      const tituloNorm = normalizar(topico.titulo);
      const corpoNorm = normalizar(corpo);

      // Título pesa mais: quem busca "repasse" quer o tópico chamado Repasse,
      // não o tópico de pedidos que menciona repasse de passagem.
      const pontos = termos.reduce((soma, termo) => {
        const noTitulo = tituloNorm.includes(termo) ? 3 : 0;
        const ocorrencias = corpoNorm.split(termo).length - 1;
        return soma + noTitulo + Math.min(ocorrencias, 3);
      }, 0);

      return { topico, pontos, trecho: trechoRelevante(corpo, termos) };
    })
    .filter((r) => r.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos);
}
