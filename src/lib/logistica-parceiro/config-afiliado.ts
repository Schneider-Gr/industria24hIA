// Configurações do afiliado logístico: os campos da aba "Configurações" do
// painel /afiliadologistica do Bubble, gravados em parceiros_logisticos.

export type EntradaConfigAfiliado = {
  nome: string;
  cep: string;
  cidade: string;
  bairro: string;
  numero: string;
  telefone: string;
  veiculo: string;
  peso: string;
  minimo: string;
};

export type CamposConfigAfiliado = {
  nome: string;
  cep_base: string;
  cidade: string;
  bairro: string;
  numero: string | null;
  telefone: string;
  veiculo: string | null;
  capacidade_kg: number | null;
  valor_minimo_entrega: number | null;
};

const texto = (v: string) => v.trim() || null;

/** Número opcional ≥ 0; aceita vírgula. undefined = inválido. */
function naoNegativo(v: string): number | null | undefined {
  const s = v.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function validarConfigAfiliado(
  e: EntradaConfigAfiliado,
): { ok: true; campos: CamposConfigAfiliado } | { ok: false; erro: string } {
  const nome = e.nome.trim();
  const cep = e.cep.replace(/\D/g, "");
  const telefone = e.telefone.replace(/\D/g, "");
  const cidade = e.cidade.trim();
  const bairro = e.bairro.trim();
  const peso = naoNegativo(e.peso);
  const minimo = naoNegativo(e.minimo);

  if (!nome) return { ok: false, erro: "Informe o nome." };
  if (cep.length !== 8) return { ok: false, erro: "CEP deve ter 8 dígitos." };
  if (!cidade || !bairro) return { ok: false, erro: "Informe cidade e bairro." };
  if (telefone.length < 10 || telefone.length > 11) return { ok: false, erro: "Telefone deve ter DDD + número." };
  if (peso === undefined) return { ok: false, erro: "Peso suportado deve ser um número maior ou igual a zero." };
  if (minimo === undefined) return { ok: false, erro: "Valor mínimo deve ser um número maior ou igual a zero." };

  return {
    ok: true,
    campos: {
      nome,
      cep_base: cep,
      cidade,
      bairro,
      numero: texto(e.numero),
      telefone,
      veiculo: texto(e.veiculo),
      capacidade_kg: peso,
      valor_minimo_entrega: minimo,
    },
  };
}
