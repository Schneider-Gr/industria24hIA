// Modo simples (PRD 049 US11, spec seller-transportadoras/modo-simples):
// grade zona × veículo por CD convertida em faixas de CEP. A grade fica
// guardada para o seller editar; as faixas são derivadas e trocadas pela RPC
// substituir_faixas_transportadora com o CD (design D10).

export type NomeVeiculo = "moto" | "carro" | "utilitario";

export const VEICULOS: NomeVeiculo[] = ["moto", "carro", "utilitario"];

export type Veiculo = {
  veiculo: NomeVeiculo;
  pesoMax: number;
  alturaMax: number | null;
  larguraMax: number | null;
  comprimentoMax: number | null;
};

export type CelulaGrade = { zona: string; veiculo: NomeVeiculo; preco: number | null };

export type ZonaCep = { zona: string; cepInicial: number; cepFinal: number };

export type ParametrosGrade = {
  prazoMin: number | null;
  prazoMax: number | null;
  adValorem: number;
  icms: number;
  freteMinimo: number;
  taxaFixa: number;
  zonasNaoAtendidas: string[];
};

export type FaixaGrade = {
  cepDestinoInicial: number;
  cepDestinoFinal: number;
  pesoMin: number;
  pesoMax: number;
  valor: number;
  prazoMin: number | null;
  prazoMax: number | null;
  adValorem: number;
  kgAdicional: number;
  icms: number;
  freteMinimo: number;
  taxaFixa: number;
  veiculo: NomeVeiculo;
};

export function gradeEmFaixas(entrada: {
  celulas: CelulaGrade[];
  veiculos: Veiculo[];
  zonas: ZonaCep[];
  parametros: ParametrosGrade;
}): FaixaGrade[] {
  const { celulas, veiculos, zonas, parametros } = entrada;
  const limite = new Map(veiculos.map((v) => [v.veiculo, v.pesoMax]));
  const naoAtendidas = new Set(parametros.zonasNaoAtendidas);
  const faixas: FaixaGrade[] = [];

  // Ordem estável: veículo, depois zona na ordem da grade, depois CEP.
  for (const nome of VEICULOS) {
    const pesoMax = limite.get(nome);
    if (!pesoMax) continue; // veículo sem limite cadastrado = a transportadora não tem
    for (const c of celulas) {
      if (c.veiculo !== nome || c.preco === null || naoAtendidas.has(c.zona)) continue;
      for (const z of zonas) {
        if (z.zona !== c.zona) continue;
        faixas.push({
          cepDestinoInicial: z.cepInicial,
          cepDestinoFinal: z.cepFinal,
          pesoMin: 0,
          pesoMax,
          valor: c.preco,
          prazoMin: parametros.prazoMin,
          prazoMax: parametros.prazoMax,
          adValorem: parametros.adValorem,
          kgAdicional: 0, // sem cubagem nem kg adicional no modo simples: o veículo é o limite
          icms: parametros.icms,
          freteMinimo: parametros.freteMinimo,
          taxaFixa: parametros.taxaFixa,
          veiculo: nome,
        });
      }
    }
  }
  return faixas;
}

const MEDIDAS = [
  ["pesoMax", "peso"],
  ["alturaMax", "altura"],
  ["larguraMax", "largura"],
  ["comprimentoMax", "comprimento"],
] as const;

/** Veículo menor (moto < carro < utilitário) não pode ter limite maior que um maior. */
export function validarVeiculos(veiculos: Veiculo[]): string[] {
  const erros: string[] = [];
  const presentes = VEICULOS.map((n) => veiculos.find((v) => v.veiculo === n)).filter((v): v is Veiculo => !!v);

  for (const v of presentes) {
    if (!(v.pesoMax > 0)) erros.push(`O peso máximo de ${v.veiculo} deve ser maior que zero.`);
  }
  for (let i = 0; i < presentes.length; i++) {
    for (let j = i + 1; j < presentes.length; j++) {
      const menor = presentes[i];
      const maior = presentes[j];
      for (const [campo, rotulo] of MEDIDAS) {
        const a = menor[campo];
        const b = maior[campo];
        if (a !== null && b !== null && a > b) {
          erros.push(`${rotulo} máximo de ${menor.veiculo} (${a}) maior que o de ${maior.veiculo} (${b}).`);
        }
      }
    }
  }
  return erros;
}
