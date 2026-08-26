// Parser CSV mínimo (stdlib, sem dependência) para os dois uploads deste
// módulo. XLSX não é aceito na v1: a única lib npm mantida (`xlsx`) está
// travada numa versão com 2 CVEs altos sem fix publicado no registry
// (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) — não introduzir isso perto do
// caminho de checkout. Reavaliar quando existir alternativa segura.

function detectarSeparador(primeiraLinha: string): "," | ";" {
  return primeiraLinha.includes(";") && !primeiraLinha.includes(",") ? ";" : ",";
}

function parseLinha(linha: string, separador: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let dentroAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      dentroAspas = !dentroAspas;
    } else if (c === separador && !dentroAspas) {
      campos.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

export function parseCsvLinhas(texto: string): Record<string, string>[] {
  const linhasBrutas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (linhasBrutas.length === 0) return [];

  const separador = detectarSeparador(linhasBrutas[0]);
  const cabecalho = parseLinha(linhasBrutas[0], separador);

  return linhasBrutas.slice(1).map((linha) => {
    const campos = parseLinha(linha, separador);
    const registro: Record<string, string> = {};
    cabecalho.forEach((chave, i) => {
      registro[chave] = campos[i] ?? "";
    });
    return registro;
  });
}
