// Bairros oficiais de Manaus: os 63 do Anexo I da Lei Municipal 1.401, de
// 14/01/2010, mais a Colônia Japonesa (Lei Municipal 3.592, de 22/12/2025).
// A grafia segue a lei, que é também a que o ViaCEP devolve.
export const BAIRROS_MANAUS = [
  "Adrianópolis",
  "Aleixo",
  "Alvorada",
  "Armando Mendes",
  "Betânia",
  "Cachoeirinha",
  "Centro",
  "Chapada",
  "Cidade de Deus",
  "Cidade Nova",
  "Colônia Antônio Aleixo",
  "Colônia Japonesa",
  "Colônia Oliveira Machado",
  "Colônia Santo Antônio",
  "Colônia Terra Nova",
  "Compensa",
  "Coroado",
  "Crespo",
  "Da Paz",
  "Distrito Industrial I",
  "Distrito Industrial II",
  "Dom Pedro I",
  "Educandos",
  "Flores",
  "Gilberto Mestrinho",
  "Glória",
  "Japiim",
  "Jorge Teixeira",
  "Lago Azul",
  "Lírio do Vale",
  "Mauazinho",
  "Monte das Oliveiras",
  "Morro da Liberdade",
  "Nossa Senhora Aparecida",
  "Nossa Senhora das Graças",
  "Nova Cidade",
  "Nova Esperança",
  "Novo Aleixo",
  "Novo Israel",
  "Parque 10 de Novembro",
  "Petrópolis",
  "Planalto",
  "Ponta Negra",
  "Praça 14 de Janeiro",
  "Presidente Vargas",
  "Puraquequara",
  "Raiz",
  "Redenção",
  "Santa Etelvina",
  "Santa Luzia",
  "Santo Agostinho",
  "Santo Antônio",
  "São Francisco",
  "São Geraldo",
  "São Jorge",
  "São José Operário",
  "São Lázaro",
  "São Raimundo",
  "Tancredo Neves",
  "Tarumã",
  "Tarumã-Açu",
  "Vila Buriti",
  "Vila da Prata",
  "Zumbi dos Palmares",
] as const;

export type BairroManaus = (typeof BAIRROS_MANAUS)[number];

// Sem acento, minúsculo, só letras e dígitos separados por um espaço.
export function normalizarBairro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Como o comprador costuma escrever, quando difere do nome da lei.
// ponytail: lista curta de apelidos conhecidos; o que não casar aqui cai no
// prefixo de CEP (PRD 059). Acrescentar conforme aparecer endereço real.
const APELIDOS: Record<string, BairroManaus> = {
  aparecida: "Nossa Senhora Aparecida",
  "nossa senhora de aparecida": "Nossa Senhora Aparecida",
  "parque dez": "Parque 10 de Novembro",
  "parque 10": "Parque 10 de Novembro",
  "parque dez de novembro": "Parque 10 de Novembro",
  "dom pedro": "Dom Pedro I",
  paz: "Da Paz",
  "praca 14": "Praça 14 de Janeiro",
  "praca quatorze de janeiro": "Praça 14 de Janeiro",
  "sao jose": "São José Operário",
  "taruma acu": "Tarumã-Açu",
  "distrito industrial": "Distrito Industrial I",
};

const POR_NOME = new Map<string, BairroManaus>(
  BAIRROS_MANAUS.map((b) => [normalizarBairro(b), b]),
);

// Bairro oficial correspondente ao texto do endereço, ou null se não casar.
export function bairroOficial(texto: string | null | undefined): BairroManaus | null {
  if (!texto) return null;
  const n = normalizarBairro(texto);
  return POR_NOME.get(n) ?? APELIDOS[n] ?? null;
}
