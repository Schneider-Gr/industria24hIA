"use server";

// Botão avião do produto (#804): o seller define as bandas de frete por veículo
// (tarifa mínima e R$/km; piso também é check na 0201) e a quantidade mínima; o
// simulador mostra, por região, o custo total (km de estrada + balsa só de ida,
// tabela travessias da 0202), o % no pedido e o pedido mínimo viável.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { calcularTrajeto } from "@/lib/geo";
import {
  CLASSES,
  balsaDaTravessia,
  colunasDasBandas,
  eixosGrade,
  gradeRegiao,
  quantidadeQueCobre,
  simularRegiao,
  validarBandas,
  type Bandas,
  type NomeClasse,
} from "@/lib/logistica-parceiro/simulador-km";

const numero = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim().replace(",", "."));

export type KmState = { ok: boolean; erro?: string; msg?: string };

export async function salvarKmProduto(_prev: KmState, formData: FormData): Promise<KmState> {
  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, erro: "Faça login com a conta da loja." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, erro: "Produto inválido." };
  const desligar = formData.get("acao") === "desligar";
  const qtdMinima = numero(formData.get("quantidade_minima"));
  const opcional = (k: string) => (String(formData.get(k) ?? "").trim() === "" ? null : numero(formData.get(k)));
  const bandas = Object.fromEntries(
    CLASSES.map((c) => [c.classe, { tarifaMinima: opcional(`tarifa_minima_${c.classe}`), valorKm: opcional(`valor_km_${c.classe}`) }]),
  ) as Bandas;

  if (!desligar) {
    const erros = validarBandas(bandas);
    if (erros.length) return { ok: false, erro: erros.join(" ") };
    if (!CLASSES.some((c) => bandas[c.classe].valorKm != null)) return { ok: false, erro: "Defina o R$/km de pelo menos um veículo." };
    if (!(Number.isInteger(qtdMinima) && qtdMinima >= 1)) return { ok: false, erro: "Quantidade mínima deve ser um número inteiro a partir de 1." };
  }

  const supabase = await createClient();
  // Desligar mantém bandas e quantidade mínima, para religar sem digitar de novo.
  const dados = desligar
    ? { permite_logistica_afiliado: false }
    : { permite_logistica_afiliado: true, quantidade_minima: qtdMinima, ...colunasDasBandas(bandas) };
  const { data, error } = await supabase
    .from("produtos")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colunas da 0201 fora dos tipos gerados
    .update(dados as any)
    .eq("id", id)
    .eq("loja_id", loja.id)
    .select("id");
  if (error) return { ok: false, erro: error.message };
  if (!data?.length) return { ok: false, erro: "Produto não encontrado nesta loja." };

  revalidatePath("/seller/produtos");
  return {
    ok: true,
    msg: desligar ? "Entrega por parceiro desligada." : `Bandas salvas, mínimo de ${qtdMinima} un. por pedido.`,
  };
}

export type Travessia = {
  id: string;
  nome: string;
  fonte_descricao: string | null;
  fonte_url: string | null;
  vigente_desde: string | null;
  fatores_oficiais: boolean;
  porVeiculo: Record<NomeClasse, number | null>;
};

/** Travessia por região: detectada pelo Google (FERRY), "sem rota" por estrada ou informada pelo seller. */
export type StatusTravessia = "nenhuma" | "detectada" | "sem_rota" | "manual";
/** Travessia informada à mão numa região "sem rota": km por estrada + linha da tabela. */
export type TravessiaManual = { kmEstrada: number; travessiaId: string };

export type ResultadoRegiao = {
  destino: string;
  status: StatusTravessia;
  erro?: string;
  barco: { nome: string; metros: number }[];
  travessia?: Travessia;
  sim?: ReturnType<typeof simularRegiao>;
  grade?: ReturnType<typeof gradeRegiao>;
  eixos?: ReturnType<typeof eixosGrade>;
};
export type SimulacaoState =
  | { ok: false; erro: string }
  | { ok: true; qtd: number; preco: number; travessias: Travessia[]; regioes: ResultadoRegiao[]; cobrePrimeiras: (number | null)[] };

const ERRO_GEO: Record<string, string> = {
  nao_configurado: "Integração com o Google Maps pendente (sem chave no servidor).",
  sem_rota: "Sem rota por estrada: pode exigir barco.",
  teto_de_custo: "Limite diário de consultas ao Google Maps atingido. Tente amanhã.",
  provedor_indisponivel: "Google Maps indisponível agora. Tente de novo em instantes.",
};

// Só seller: cada região é uma consulta paga na Routes API.
export async function simularAviao(e: {
  produtoId: string;
  qtd: number;
  bandas: Bandas;
  destinos: string[];
  /** por região: travessia escolhida (linha da tabela) quando há barco */
  travessiaId?: (string | null)[];
  /** por região: valor da balsa editado pelo seller (substitui o da tabela) */
  balsaEditada?: (number | null)[];
  /** por região: travessia informada à mão numa região sem rota */
  manual?: (TravessiaManual | null)[];
}): Promise<SimulacaoState> {
  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, erro: "O simulador é do painel do seller: entre com a conta da loja." };
  const erros = validarBandas(e.bandas);
  if (erros.length) return { ok: false, erro: erros.join(" ") };
  const qtd = Math.max(1, Math.floor(e.qtd));

  const supabase = await createClient();
  const [{ data: p, error }, { data: tRows, error: te }] = await Promise.all([
    supabase.from("produtos").select("valor, peso, cep_produto").eq("id", e.produtoId).eq("loja_id", loja.id).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela da 0202 fora dos tipos gerados
    (supabase as any)
      .from("travessias")
      .select("id, nome, valor_equivalente, fator_moto, fator_carro, fator_caminhao, fatores_oficiais, fonte_url, fonte_descricao, vigente_desde")
      .eq("ativo", true)
      .order("nome"),
  ]);
  if (error) return { ok: false, erro: error.message };
  if (te) return { ok: false, erro: `Falha ao ler a tabela de travessias: ${te.message}` };
  if (!p) return { ok: false, erro: "Produto não encontrado nesta loja." };
  const preco = Number(p.valor);
  if (!(preco > 0)) return { ok: false, erro: "Produto sem preço: cadastre o valor em Editar." };
  const pesoUnitKg = Number(p.peso);
  if (!(pesoUnitKg > 0)) return { ok: false, erro: 'Produto sem peso: o veículo depende do peso. Cadastre em Editar → "Dimensões e peso".' };

  type Linha = Omit<Travessia, "porVeiculo"> & Parameters<typeof balsaDaTravessia>[0];
  const travessias: Travessia[] = ((tRows ?? []) as Linha[]).map((t) => ({
    id: t.id,
    nome: t.nome,
    fonte_descricao: t.fonte_descricao,
    fonte_url: t.fonte_url,
    vigente_desde: t.vigente_desde,
    fatores_oficiais: t.fatores_oficiais,
    porVeiculo: balsaDaTravessia(t),
  }));
  // Padrão quando o Google acha barco: a balsa (a travessia regulada na rota do simulador).
  const padrao = travessias.find((t) => /balsa/i.test(t.nome)) ?? travessias[0];

  // Origem = CEP do produto, senão endereço completo da loja (só o CEP o Google
  // às vezes põe no bairro errado).
  const cep = p.cep_produto ? String(p.cep_produto).replace(/\D/g, "").padStart(8, "0") : null;
  const origem = cep
    ? `${cep.slice(0, 5)}-${cep.slice(5)}, Brasil`
    : [[loja.rua, loja.numero].filter(Boolean).join(" "), loja.bairro, loja.cidade, loja.cep].filter(Boolean).join(", ");

  const calcula = (distanciaM: number, barcoM: number, travessia: Travessia | undefined, editada: number | null | undefined) => {
    const balsa = travessia
      ? editada != null
        ? { moto: editada, carro: editada, caminhao: editada }
        : travessia.porVeiculo
      : undefined;
    const sim = simularRegiao({ distanciaM, barcoM, balsa, pesoUnitKg, preco, qtd, bandas: e.bandas });
    const c = CLASSES.find((k) => k.classe === sim.frete.classe)!;
    const eixos = eixosGrade({ qtd, valorKmAtual: sim.frete.valorKm, pisoKm: c.pisoKm });
    const grade = gradeRegiao({ distanciaM, barcoM, balsa, pesoUnitKg, preco, bandas: e.bandas, ...eixos });
    return { sim, grade, eixos };
  };

  const regioes = await Promise.all(
    e.destinos.slice(0, 3).map(async (bruto, i): Promise<ResultadoRegiao> => {
      const destino = bruto.trim();
      const manual = e.manual?.[i];
      const escolhida = travessias.find((t) => t.id === e.travessiaId?.[i]);
      if (manual) {
        const travessia = travessias.find((t) => t.id === manual.travessiaId) ?? padrao;
        return {
          destino,
          status: "manual",
          barco: [],
          travessia,
          ...calcula(Math.max(0, manual.kmEstrada) * 1000, 0, travessia, e.balsaEditada?.[i]),
        };
      }
      if (!destino) return { destino, status: "nenhuma", erro: "Informe o destino.", barco: [] };
      const r = await calcularTrajeto(origem, destino);
      if (!r.ok) return { destino, status: r.erro === "sem_rota" ? "sem_rota" : "nenhuma", erro: ERRO_GEO[r.erro], barco: [] };
      const barcoM = r.valor.barco.reduce((soma, b) => soma + b.metros, 0);
      if (barcoM === 0) return { destino, status: "nenhuma", barco: [], ...calcula(r.valor.distancia_m, 0, undefined, null) };
      const travessia = escolhida ?? padrao;
      return {
        destino,
        status: "detectada",
        barco: r.valor.barco,
        travessia,
        ...calcula(r.valor.distancia_m, barcoM, travessia, e.balsaEditada?.[i]),
      };
    }),
  );

  // Pedido mínimo sugerido: menor quantidade que fecha a 1ª região, as 2 primeiras, as 3.
  const estaveis = regioes.map((r) => r.sim?.viavel.estavel ?? null);
  const cobrePrimeiras = estaveis.map((_, k) => quantidadeQueCobre(estaveis.slice(0, k + 1)));
  return { ok: true, qtd, preco, travessias, regioes, cobrePrimeiras };
}
