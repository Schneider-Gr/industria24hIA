// Parser XLSX mínimo (só a primeira aba, sem fórmulas/estilos) — sem
// dependência de terceiros (ver zip-min.ts). Devolve o mesmo formato de
// parseCsvLinhas (Record<string,string>[]), pra parser-lista.ts e
// parser-tabela-frete.ts não mudarem.

import { lerEntradaZip } from "./zip-min";

function extrairSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const regexSi = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = regexSi.exec(xml))) {
    const textos = [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]);
    strings.push(decodificarEntidadesXml(textos.join("")));
  }
  return strings;
}

function decodificarEntidadesXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function colunaDaReferencia(ref: string): number {
  const letras = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1; // 0-indexed
}

function extrairLinhasDaSheet(xml: string, sharedStrings: string[]): string[][] {
  const linhas: string[][] = [];
  const regexRow = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = regexRow.exec(xml))) {
    const celulas: string[] = [];
    const regexCell = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = regexCell.exec(rowMatch[1]))) {
      const attrs = cellMatch[1];
      const conteudo = cellMatch[2] ?? "";
      const refMatch = attrs.match(/r="([A-Z]+\d+)"/);
      const col = refMatch ? colunaDaReferencia(refMatch[1]) : celulas.length;

      const tipo = attrs.match(/t="([^"]+)"/)?.[1];
      let valor = "";
      if (tipo === "s") {
        const idx = Number(conteudo.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "-1");
        valor = sharedStrings[idx] ?? "";
      } else if (tipo === "inlineStr") {
        valor = decodificarEntidadesXml(conteudo.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "");
      } else {
        valor = decodificarEntidadesXml(conteudo.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
      }

      while (celulas.length < col) celulas.push("");
      celulas[col] = valor;
    }

    linhas.push(celulas);
  }

  return linhas;
}

export async function parseXlsxLinhas(bytes: Uint8Array): Promise<Record<string, string>[]> {
  const sheetBytes = await lerEntradaZip(bytes, "xl/worksheets/sheet1.xml");
  if (!sheetBytes) throw new Error("xl/worksheets/sheet1.xml não encontrado — arquivo não parece um .xlsx válido.");

  const sharedStringsBytes = await lerEntradaZip(bytes, "xl/sharedStrings.xml");
  const sharedStrings = sharedStringsBytes
    ? extrairSharedStrings(new TextDecoder("utf-8").decode(sharedStringsBytes))
    : [];

  const linhasBrutas = extrairLinhasDaSheet(new TextDecoder("utf-8").decode(sheetBytes), sharedStrings);
  if (linhasBrutas.length === 0) return [];

  const numColunas = Math.max(...linhasBrutas.map((l) => l.length));
  const cabecalho = linhasBrutas[0];
  while (cabecalho.length < numColunas) cabecalho.push("");

  return linhasBrutas
    .slice(1)
    .filter((linha) => linha.some((v) => v.trim() !== ""))
    .map((linha) => {
      const registro: Record<string, string> = {};
      cabecalho.forEach((chave, i) => {
        registro[chave] = linha[i] ?? "";
      });
      return registro;
    });
}
