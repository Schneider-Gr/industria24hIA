// Validador DETERMINÍSTICO do loop de design (regra do piloto: o critério de
// parada nunca é o LLM se auto-avaliando). Regras derivadas de web/DESIGN.md.

export function validar(original: string, codigo: string): string[] {
  const problemas: string[] = [];

  // 0) saída deve ser código puro, não markdown
  if (/^\s*```/.test(codigo)) {
    problemas.push("Saída contém cerca de código markdown (```); devolva SÓ o conteúdo do arquivo.");
  }

  // 1) guarda de integridade: exports do original precisam sobreviver
  const exps = original.match(/export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class)\s+(\w+)/g) ?? [];
  for (const e of exps) {
    const nome = e.match(/(\w+)\s*$/)?.[1];
    if (nome && !codigo.includes(nome)) {
      problemas.push(`O símbolo exportado "${nome}" sumiu — mantenha todos os exports do arquivo original.`);
    }
  }
  if (original.includes('"use client"') && !codigo.includes('"use client"')) {
    problemas.push('A diretiva "use client" sumiu do topo do arquivo.');
  }

  // 2) guarda de tamanho: reescrita, não re-invenção
  if (codigo.length < original.length * 0.5 || codigo.length > original.length * 2.2) {
    problemas.push(`Tamanho suspeito (original ${original.length} chars, saída ${codigo.length}); reescreva mantendo a estrutura e a lógica.`);
  }

  // 3) paleta: bloqueia as famílias "SaaS default" (nunca fizeram parte de
  // nenhuma identidade deste projeto) e, explicitamente, as duas paletas
  // legadas (roxo/laranja/amarelo; Aço & Sinal: aco-*/sinal*/verde-24h*) e
  // qualquer verde novo — a troca de paleta de 2026-07-29 (DESIGN.md) foi
  // propositalmente verde→azul, então "green" aparecendo é regressão, não
  // cor válida. Tokens atuais permitidos: lm-azul, lm-azul-escuro,
  // lm-marinho, lm-cinza, lm-amarelo, lm-vermelho.
  const coresProibidas = codigo.match(
    /\b(?:bg|text|border|ring|from|to|divide)-(?:blue|indigo|purple|violet|fuchsia|pink|sky|cyan|green|emerald|lime|roxo|laranja|amarelo|teal|aco|sinal|verde)(?:-[a-z0-9]+)?\b/g,
  );
  if (coresProibidas?.length) {
    problemas.push(`Classes de cor fora da paleta: ${[...new Set(coresProibidas)].join(", ")} — use os tokens lm-azul, lm-azul-escuro, lm-marinho, lm-cinza, lm-amarelo, lm-vermelho, ink, ink-2, muted, surface, line, ok, warn, erro, info.`);
  }

  // 4) sem gradiente decorativo
  if (/bg-gradient-to-/.test(codigo)) {
    problemas.push("Gradiente decorativo é proibido pelo DESIGN.md — remova bg-gradient-to-*.");
  }

  // 5) rounded-full só em avatar
  const linhas = codigo.split("\n");
  linhas.forEach((l, i) => {
    if (l.includes("rounded-full") && !/avatar|foto|logo/i.test(l)) {
      problemas.push(`Linha ${i + 1}: rounded-full fora de avatar — radius máximo é rounded-lg (8px).`);
    }
  });

  // 6) dinheiro sempre em Geist tabular (classe utilitária `num`)
  if (/R\$/.test(codigo) && !/\bnum\b/.test(codigo)) {
    problemas.push('Há valores "R$" sem a classe utilitária `num` (Geist tabular-nums) no elemento que os exibe.');
  }

  // 7) títulos h1/h2 em Cabinet Grotesk
  const titulosSem = codigo.match(/<h[12][^>]*className="(?![^"]*font-display)[^"]*"/g);
  if (titulosSem?.length) {
    problemas.push(`${titulosSem.length} título(s) <h1>/<h2> sem font-display — títulos usam Cabinet Grotesk.`);
  }

  return problemas;
}
