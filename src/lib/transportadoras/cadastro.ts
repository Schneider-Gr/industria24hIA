// Validação do cadastro da transportadora (PRD 049 US01, spec
// seller-transportadoras/cadastro-transportadora). Limite vazio (null) = sem
// limite. Nome único por loja fica no banco (índice da 0194), não aqui.

export type CadastroTransportadora = {
  nome: string;
  pesoMin: number | null;
  pesoMax: number | null;
  valorMin: number | null;
  valorMax: number | null;
  fatorCubagem: number | null;
};

export type ErrosCadastro = Partial<Record<keyof CadastroTransportadora, string>>;

export function validarCadastroTransportadora(
  c: CadastroTransportadora,
  opcoes: { modoAvancado: boolean },
): ErrosCadastro {
  const erros: ErrosCadastro = {};
  if (c.nome.trim() === "") erros.nome = "Nome é obrigatório.";

  for (const campo of ["pesoMin", "pesoMax", "valorMin", "valorMax", "fatorCubagem"] as const) {
    const v = c[campo];
    if (v !== null && (!Number.isFinite(v) || v < 0)) erros[campo] = "Informe um número não negativo.";
  }
  if (c.pesoMin !== null && c.pesoMax !== null && c.pesoMin > c.pesoMax) {
    erros.pesoMin = "Peso mínimo maior que o peso máximo.";
  }
  if (c.valorMin !== null && c.valorMax !== null && c.valorMin > c.valorMax) {
    erros.valorMin = "Valor mínimo maior que o valor máximo.";
  }
  if (opcoes.modoAvancado && !(c.fatorCubagem && c.fatorCubagem > 0)) {
    erros.fatorCubagem = "Fator de cubagem é obrigatório para subir tabela no modo avançado.";
  }
  return erros;
}
