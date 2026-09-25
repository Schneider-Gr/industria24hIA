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

export type ErrosCadastro = Partial<
  Record<keyof CadastroTransportadora | "altura_max" | "largura_max" | "comprimento_max" | "prazo_dias" | "url_rastreio", string>
>;

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

function numeroDoForm(fd: FormData, campo: string): number | null {
  const s = String(fd.get(campo) ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function textoDoForm(fd: FormData, campo: string): string | null {
  const s = String(fd.get(campo) ?? "").trim();
  return s === "" ? null : s;
}

/** Campos do formulário de transportadora, já no formato da tabela, e os erros. */
export function cadastroDoForm(fd: FormData) {
  const cadastro: CadastroTransportadora = {
    nome: String(fd.get("nome") ?? ""),
    pesoMin: numeroDoForm(fd, "peso_min"),
    pesoMax: numeroDoForm(fd, "peso_max"),
    valorMin: numeroDoForm(fd, "valor_min"),
    valorMax: numeroDoForm(fd, "valor_max"),
    fatorCubagem: numeroDoForm(fd, "fator_cubagem"),
  };
  const erros = validarCadastroTransportadora(cadastro, { modoAvancado: false });
  const medidas = {
    altura_max: numeroDoForm(fd, "altura_max"),
    largura_max: numeroDoForm(fd, "largura_max"),
    comprimento_max: numeroDoForm(fd, "comprimento_max"),
    prazo_dias: numeroDoForm(fd, "prazo_dias"),
  };
  for (const [campo, v] of Object.entries(medidas)) {
    if (v !== null && (!Number.isFinite(v) || v <= 0)) erros[campo as keyof ErrosCadastro] = "Informe um número positivo.";
  }
  const url = textoDoForm(fd, "url_rastreio");
  if (url && !/^https?:\/\//i.test(url)) erros.url_rastreio = "A URL de rastreio precisa começar com http:// ou https://.";

  return {
    erros,
    payload: {
      nome: cadastro.nome.trim(),
      codigo_referencia: textoDoForm(fd, "codigo_referencia"),
      peso_min: cadastro.pesoMin,
      peso_max: cadastro.pesoMax,
      valor_min: cadastro.valorMin,
      valor_max: cadastro.valorMax,
      fator_cubagem: cadastro.fatorCubagem,
      altura_max: medidas.altura_max,
      largura_max: medidas.largura_max,
      comprimento_max: medidas.comprimento_max,
      prazo_dias: medidas.prazo_dias === null ? null : Math.round(medidas.prazo_dias),
      url_rastreio: url,
    },
  };
}
