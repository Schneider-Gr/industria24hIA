// Extraído de MercadoFuturo.tsx (que é "use client"): função pura de formatação
// não pode ser importada de Server Components a partir de um módulo client.
export function formatDataCurtaAno(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}
