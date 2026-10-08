// Área de atuação do parceiro logístico: o estado vem do CEP base, dentro dele
// o parceiro marca cidades, e em Manaus marca bairros agrupados por zona.
// As regras de quem vê e aceita cada corrida ficam no banco (0217,
// `entregador_ve_corrida`); aqui mora só o que a tela e a action precisam.

import { BAIRROS_MANAUS, bairroOficial, type BairroManaus } from "./bairros-manaus";
import { MUNICIPIOS, type Municipio } from "./municipios";

export const IBGE_MANAUS = "1302603";

export const UFS_HABILITADAS: Readonly<Record<string, string>> = { AM: "Amazonas", AC: "Acre" };

export function municipioDoCep(cep: string): Municipio | null {
  const d = cep.replace(/\D/g, "");
  if (d.length !== 8) return null;
  const n = Number(d);
  return MUNICIPIOS.find((m) => m.faixas.some(([ini, fim]) => n >= ini && n <= fim)) ?? null;
}

/** "AM" ou "AC" para CEP dos estados habilitados, "XX" para CEP válido de
 *  outro lugar, null para CEP incompleto. Espelha a `uf_do_cep` da 0217. */
export function ufDoCep(cep: string): string | null {
  if (cep.replace(/\D/g, "").length !== 8) return null;
  return municipioDoCep(cep)?.uf ?? "XX";
}

export function municipiosDaUf(uf: string): Municipio[] {
  return MUNICIPIOS.filter((m) => m.uf === uf);
}

// Zonas administrativas de Manaus. Divisão conferida em 08/10/2026 na lista de
// bairros por zona da Wikipédia (fontes: SEDECTI 2017 e Implurb); o teste
// garante que as seis zonas somam exatamente os 64 bairros oficiais.
export const ZONAS_MANAUS: readonly { nome: string; bairros: readonly BairroManaus[] }[] = [
  {
    nome: "Zona Sul",
    bairros: [
      "Betânia", "Cachoeirinha", "Centro", "Colônia Oliveira Machado", "Crespo", "Distrito Industrial I",
      "Educandos", "Japiim", "Morro da Liberdade", "Nossa Senhora Aparecida", "Petrópolis",
      "Praça 14 de Janeiro", "Presidente Vargas", "Raiz", "Santa Luzia", "São Francisco", "São Lázaro",
      "Vila Buriti",
    ],
  },
  {
    nome: "Zona Centro-Sul",
    bairros: [
      "Adrianópolis", "Aleixo", "Chapada", "Colônia Japonesa", "Flores", "Nossa Senhora das Graças",
      "Parque 10 de Novembro", "São Geraldo",
    ],
  },
  { nome: "Zona Centro-Oeste", bairros: ["Alvorada", "Da Paz", "Dom Pedro I", "Planalto", "Redenção"] },
  {
    nome: "Zona Oeste",
    bairros: [
      "Compensa", "Glória", "Lírio do Vale", "Nova Esperança", "Ponta Negra", "Santo Agostinho",
      "Santo Antônio", "São Jorge", "São Raimundo", "Tarumã", "Tarumã-Açu", "Vila da Prata",
    ],
  },
  {
    nome: "Zona Norte",
    bairros: [
      "Cidade de Deus", "Cidade Nova", "Colônia Santo Antônio", "Colônia Terra Nova", "Lago Azul",
      "Monte das Oliveiras", "Nova Cidade", "Novo Aleixo", "Novo Israel", "Santa Etelvina",
    ],
  },
  {
    nome: "Zona Leste",
    bairros: [
      "Armando Mendes", "Colônia Antônio Aleixo", "Coroado", "Distrito Industrial II", "Gilberto Mestrinho",
      "Jorge Teixeira", "Mauazinho", "Puraquequara", "São José Operário", "Tancredo Neves",
      "Zumbi dos Palmares",
    ],
  },
];

export type AreaValidada =
  | { ok: true; uf: string | null; cidades: string[]; bairros: BairroManaus[] }
  | { ok: false; erro: string };

/** O que a action grava. Estado fora da lista habilitada: cadastro passa, área
 *  fica vazia. Manaus inteira (os 64 bairros) vira uma linha de cidade. */
export function validarArea(e: { cep: string; cidades: string[]; bairros: string[] }): AreaValidada {
  const uf = ufDoCep(e.cep);
  if (!uf || !UFS_HABILITADAS[uf]) return { ok: true, uf, cidades: [], bairros: [] };

  const cidades = new Set<string>();
  for (const c of e.cidades) {
    const m = MUNICIPIOS.find((x) => x.ibge === c);
    if (!m || m.uf !== uf) return { ok: false, erro: "Cidade fora do estado do seu CEP base." };
    cidades.add(m.ibge);
  }

  const bairros = new Set<BairroManaus>();
  if (uf === "AM" && !cidades.has(IBGE_MANAUS)) {
    for (const b of e.bairros) {
      const oficial = bairroOficial(b);
      if (!oficial) return { ok: false, erro: `Bairro fora da lista de Manaus: "${b}".` };
      bairros.add(oficial);
    }
    if (bairros.size === BAIRROS_MANAUS.length) {
      bairros.clear();
      cidades.add(IBGE_MANAUS);
    }
  }
  return { ok: true, uf, cidades: [...cidades], bairros: [...bairros] };
}

/** Texto curto para a lista do admin (`parceiros_logisticos.area_atuacao`). */
export function resumoArea(cidades: string[], bairros: string[]): string | null {
  const nomes = cidades
    .map((c) => MUNICIPIOS.find((m) => m.ibge === c)?.nome)
    .filter((n): n is string => !!n);
  const partes = [
    ...(bairros.length > 0 ? [`Manaus (${bairros.length} ${bairros.length === 1 ? "bairro" : "bairros"})`] : []),
    ...nomes,
  ];
  return partes.length > 0 ? partes.join(", ") : null;
}
