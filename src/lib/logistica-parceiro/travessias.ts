// Formulário do admin da tabela travessias (0202, #804).

const num = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim().replace(",", ".");
  return t === "" ? null : Number(t);
};
const texto = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

export function travessiaDoForm(f: FormData) {
  const dados = {
    nome: String(f.get("nome") ?? "").trim(),
    operador: texto(f.get("operador")),
    valor_equivalente: num(f.get("valor_equivalente")),
    fator_moto: num(f.get("fator_moto")),
    fator_carro: num(f.get("fator_carro")),
    fator_caminhao: num(f.get("fator_caminhao")),
    fatores_oficiais: f.get("fatores_oficiais") === "on",
    fonte_url: texto(f.get("fonte_url")),
    fonte_descricao: texto(f.get("fonte_descricao")),
    vigente_desde: texto(f.get("vigente_desde")),
    ativo: f.get("ativo") === "on",
  };
  const erros: string[] = [];
  if (!dados.nome) erros.push("Informe o nome.");
  if (!(dados.valor_equivalente != null && dados.valor_equivalente > 0)) erros.push("Valor por veículo equivalente deve ser maior que zero.");
  for (const [k, nome] of [["fator_moto", "da moto"], ["fator_carro", "do carro"], ["fator_caminhao", "do caminhão"]] as const) {
    const v = dados[k];
    if (v != null && !(v > 0)) erros.push(`Fator ${nome} deve ser maior que zero.`);
  }
  return { erros, dados: erros.length ? null : dados };
}
