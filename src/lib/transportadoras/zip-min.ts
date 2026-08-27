// ZIP mínimo (só o necessário pra ler .xlsx): lê o End Of Central Directory
// e a Central Directory pra localizar entradas por nome, descomprime com
// DecompressionStream nativo (method 8 = deflate-raw; method 0 = store).
// Sem dependência de terceiros — mesma decisão de csv.ts (xlsx do npm tem
// 2 CVEs altos sem fix, ver GHSA-4r6h-8v6p-xvw6/GHSA-5pgg-2g8v-p4x9).

const EOCD_SIG = 0x06054b50;
const CDH_SIG = 0x02014b50;

async function inflar(dados: Uint8Array, metodo: number): Promise<Uint8Array> {
  if (metodo === 0) return dados;
  if (metodo !== 8) throw new Error(`Método de compressão ZIP não suportado: ${metodo}`);
  const stream = new Blob([dados as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function lerEntradaZip(bytes: Uint8Array, nomeArquivo: string): Promise<Uint8Array | null> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("Arquivo não é um .xlsx válido (EOCD não encontrado).");

  const totalEntradas = view.getUint16(eocdOffset + 10, true);
  const offsetCD = view.getUint32(eocdOffset + 16, true);

  let ponteiro = offsetCD;
  const decoder = new TextDecoder("utf-8");

  for (let i = 0; i < totalEntradas; i++) {
    if (view.getUint32(ponteiro, true) !== CDH_SIG) break;

    const metodo = view.getUint16(ponteiro + 10, true);
    const tamComprimido = view.getUint32(ponteiro + 20, true);
    const tamNome = view.getUint16(ponteiro + 28, true);
    const tamExtra = view.getUint16(ponteiro + 30, true);
    const tamComentario = view.getUint16(ponteiro + 32, true);
    const offsetLocal = view.getUint32(ponteiro + 42, true);
    const nome = decoder.decode(bytes.subarray(ponteiro + 46, ponteiro + 46 + tamNome));

    if (nome === nomeArquivo) {
      const tamNomeLocal = view.getUint16(offsetLocal + 26, true);
      const tamExtraLocal = view.getUint16(offsetLocal + 28, true);
      const inicioDados = offsetLocal + 30 + tamNomeLocal + tamExtraLocal;
      const dados = bytes.subarray(inicioDados, inicioDados + tamComprimido);
      return inflar(dados, metodo);
    }

    ponteiro += 46 + tamNome + tamExtra + tamComentario;
  }

  return null;
}
