// ponytail: janela deslizante em memória do processo — sem dependência nova
// (Redis/Upstash exigiriam conta e segredo que este projeto não tem hoje).
// Teto real: não é compartilhado entre instâncias serverless concorrentes da
// Vercel, então um atacante distribuído entre instâncias frias pode passar
// disso. Upgrade para @upstash/ratelimit quando abuso real for observado
// (Sentry já loga o rejeitado — dá pra medir antes de trocar).
const hits = new Map<string, number[]>();

export function checarLimite(chave: string, max: number, janelaMs: number): boolean {
  const agora = Date.now();
  const historico = (hits.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (historico.length >= max) {
    hits.set(chave, historico);
    return false;
  }
  historico.push(agora);
  hits.set(chave, historico);
  return true;
}
