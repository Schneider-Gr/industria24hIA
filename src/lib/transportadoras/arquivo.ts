// Detecta CSV vs XLSX pela extensão do arquivo enviado e devolve o mesmo
// formato (Record<string,string>[]) pros parsers de negócio consumirem.

import { parseCsvLinhas } from "./csv";
import { parseXlsxLinhas } from "./xlsx";

export async function lerLinhasArquivo(arquivo: File): Promise<Record<string, string>[]> {
  const nome = arquivo.name.toLowerCase();

  if (nome.endsWith(".csv")) {
    return parseCsvLinhas(await arquivo.text());
  }

  if (nome.endsWith(".xlsx")) {
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    return parseXlsxLinhas(bytes);
  }

  throw new Error("Formato não suportado — envie um arquivo .csv ou .xlsx.");
}
