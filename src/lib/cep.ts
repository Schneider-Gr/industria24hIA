export const CEP_COOKIE = "cep_comprador";

export type EnderecoCep = {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  uf: string;
  // Coordenada do comprador (PRD 026). Vem de graça quando ele libera a
  // localização do navegador; por CEP digitado fica indefinida aqui e o
  // servidor resolve pelo cache `ceps_geo`.
  lat?: number;
  lon?: number;
};

export function limparCep(cep: string): string {
  return cep.replace(/\D/g, "");
}

export function formatarCep(cep: string): string {
  const limpo = limparCep(cep).slice(0, 8);
  return limpo.length > 5 ? `${limpo.slice(0, 5)}-${limpo.slice(5)}` : limpo;
}

// ponytail: ViaCEP direto (sem chave, CORS liberado); trocar por provedor
// pago se a taxa de erro/latência incomodar em produção.
export async function buscarEndereco(cep: string): Promise<EnderecoCep | null> {
  const limpo = limparCep(cep);
  if (limpo.length !== 8) return null;

  const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.erro) return null;

  return {
    cep: limpo,
    rua: data.logradouro ?? "",
    bairro: data.bairro ?? "",
    cidade: data.localidade ?? "",
    uf: data.uf ?? "",
  };
}

export function lerEnderecoCookie(valor: string | undefined): EnderecoCep | null {
  if (!valor) return null;
  try {
    const parsed = JSON.parse(valor);
    if (typeof parsed?.cep === "string") return parsed as EnderecoCep;
    return null;
  } catch {
    return null;
  }
}

export type FaixaCep = {
  cep_inicial: number;
  cep_final: number;
  loja_id: string | null;
  ativo: boolean;
};

// Mesma regra da RPC checkout_criar_pedido (migration 0044): faixa da
// própria loja tem prioridade; loja_id null = fallback global.
export function lojaCobreCep(faixas: FaixaCep[], lojaId: string, cep: string): boolean {
  const cepNum = Number(limparCep(cep));
  if (!cepNum) return true; // sem CEP válido = não filtra

  const candidatas = faixas.filter(
    (f) => f.ativo && cepNum >= f.cep_inicial && cepNum <= f.cep_final && (f.loja_id === lojaId || f.loja_id === null),
  );
  return candidatas.length > 0;
}
