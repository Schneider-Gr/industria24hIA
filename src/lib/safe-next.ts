// Destino interno seguro para redirect pós-auth. Aceita só caminho relativo que
// começa com uma única barra e NÃO é seguido de / ou \ — o backslash importa:
// navegadores normalizam "/\evil.com" para "//evil.com" (protocolo-relativo),
// que o teste ingênuo startsWith("//") deixava passar. Fora do padrão → fallback.
export function safeNext(raw: string | null | undefined, fallback: string): string {
  return raw && /^\/(?![/\\])/.test(raw) ? raw : fallback;
}
