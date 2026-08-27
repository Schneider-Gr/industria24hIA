// Gerador de .xlsx mínimo, usado só pelos testes de xlsx.ts — exercita o
// mesmo caminho de descompressão (deflate-raw) que um arquivo real do
// Excel usa, sem depender de um arquivo fixture binário versionado.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function u16(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}
function u32(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff]);
}
function concat(...partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of partes) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

async function criarEntradaZip(nome: string, conteudo: string) {
  const nomeBytes = new TextEncoder().encode(nome);
  const dadosOriginais = new TextEncoder().encode(conteudo);
  const dadosComprimidos = await deflate(dadosOriginais);
  const crc = crc32(dadosOriginais);

  const local = concat(
    u32(0x04034b50),
    u16(20), // version needed
    u16(0), // flags
    u16(8), // method: deflate
    u16(0), // mod time
    u16(0), // mod date
    u32(crc),
    u32(dadosComprimidos.length),
    u32(dadosOriginais.length),
    u16(nomeBytes.length),
    u16(0), // extra length
    nomeBytes,
    dadosComprimidos,
  );

  return { local, nome: nomeBytes, crc, tamComprimido: dadosComprimidos.length, tamOriginal: dadosOriginais.length };
}

function linhaXml(indice: number, valores: string[]): string {
  const cols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const celulas = valores
    .map((v, i) => {
      if (v === "") return "";
      const ref = `${cols[i]}${indice}`;
      // Colunas pares (0-indexed) viram shared string; ímpares, valor bruto —
      // exercita os dois caminhos que xlsx.ts precisa suportar.
      if (i % 2 === 0) return `<c r="${ref}" t="s"><v>${v}</v></c>`;
      return `<c r="${ref}"><v>${v}</v></c>`;
    })
    .join("");
  return `<row r="${indice}">${celulas}</row>`;
}

export async function criarXlsxDeTeste(linhas: string[][]): Promise<Uint8Array> {
  const sharedStringsUnicas: string[] = [];
  const indiceDe = new Map<string, number>();

  // Colunas pares viram índice em sharedStrings; substitui o valor bruto da
  // célula por esse índice antes de montar o XML da sheet.
  const linhasComIndice = linhas.map((linha) =>
    linha.map((valor, i) => {
      if (i % 2 !== 0 || valor === "") return valor;
      if (!indiceDe.has(valor)) {
        indiceDe.set(valor, sharedStringsUnicas.length);
        sharedStringsUnicas.push(valor);
      }
      return String(indiceDe.get(valor));
    }),
  );

  const sheetXml = `<?xml version="1.0"?><worksheet><sheetData>${linhasComIndice
    .map((l, i) => linhaXml(i + 1, l))
    .join("")}</sheetData></worksheet>`;

  const sharedStringsXml = `<?xml version="1.0"?><sst count="${sharedStringsUnicas.length}" uniqueCount="${sharedStringsUnicas.length}">${sharedStringsUnicas
    .map((s) => `<si><t>${s}</t></si>`)
    .join("")}</sst>`;

  const entradas = [
    await criarEntradaZip("xl/worksheets/sheet1.xml", sheetXml),
    await criarEntradaZip("xl/sharedStrings.xml", sharedStringsXml),
  ];

  let offset = 0;
  const locais: Uint8Array[] = [];
  const centrais: Uint8Array[] = [];

  for (const e of entradas) {
    locais.push(e.local);
    centrais.push(
      concat(
        u32(0x02014b50),
        u16(20), // version made by
        u16(20), // version needed
        u16(0), // flags
        u16(8), // method
        u16(0), // mod time
        u16(0), // mod date
        u32(e.crc),
        u32(e.tamComprimido),
        u32(e.tamOriginal),
        u16(e.nome.length),
        u16(0), // extra
        u16(0), // comment
        u16(0), // disk number
        u16(0), // internal attrs
        u32(0), // external attrs
        u32(offset),
        e.nome,
      ),
    );
    offset += e.local.length;
  }

  const centralDirOffset = offset;
  const centralDirBytes = concat(...centrais);

  const eocd = concat(
    u32(0x06054b50),
    u16(0), // disk number
    u16(0), // disk with CD
    u16(entradas.length),
    u16(entradas.length),
    u32(centralDirBytes.length),
    u32(centralDirOffset),
    u16(0), // comment length
  );

  return concat(...locais, centralDirBytes, eocd);
}
