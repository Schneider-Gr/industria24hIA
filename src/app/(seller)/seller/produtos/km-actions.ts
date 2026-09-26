"use server";

// Botão avião do produto (decisão da dona, 25/09/2026): o seller define as três
// bandas de frete (moto, carro, caminhão: tarifa mínima e R$/km) e a quantidade
// mínima do produto; o simulador mostra o frete total para perto, médio e longe
// e a quantidade mínima viável. O piso de cada veículo também é check na 0201.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { calcularTrajeto } from "@/lib/geo";
import {
  CLASSES,
  colunasDasBandas,
  simularRegiao,
  validarBandas,
  type Bandas,
  type Extras,
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
  const { data, error } = await supabase
    .from("produtos")
    .update(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colunas da 0201 fora dos tipos gerados
      (desligar
        ? { permite_logistica_afiliado: false }
        : { permite_logistica_afiliado: true, quantidade_minima: qtdMinima, ...colunasDasBandas(bandas) }) as any,
    )
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

export type ResultadoDestino =
  | { destino: string; erro: string }
  | ({ destino: string } & ReturnType<typeof simularRegiao>);
export type SimulacaoState = { ok: false; erro: string } | { ok: true; resultados: ResultadoDestino[] };

const ERRO_GEO: Record<string, string> = {
  nao_configurado: "Integração com o Google Maps pendente (sem chave no servidor).",
  sem_rota: "Sem rota de carro até esse destino (confira o CEP do produto em Editar).",
  teto_de_custo: "Limite diário de consultas ao Google Maps atingido. Tente amanhã.",
  provedor_indisponivel: "Google Maps indisponível agora. Tente de novo em instantes.",
};

// Só seller: cada destino é uma consulta paga na Routes API.
export async function simularKmProduto(
  e: { produtoId: string; bandas: Bandas; qtd: number; destinos: string[] } & Extras,
): Promise<SimulacaoState> {
  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, erro: "O simulador é do painel do seller: entre com a conta da loja." };
  const erros = validarBandas(e.bandas);
  if (erros.length) return { ok: false, erro: erros.join(" ") };
  const qtd = Math.max(1, Math.floor(e.qtd));

  const supabase = await createClient();
  const { data: p, error } = await supabase
    .from("produtos")
    .select("valor, peso, cep_produto")
    .eq("id", e.produtoId)
    .eq("loja_id", loja.id)
    .maybeSingle();
  if (error) return { ok: false, erro: error.message };
  if (!p) return { ok: false, erro: "Produto não encontrado nesta loja." };
  const preco = Number(p.valor);
  if (!(preco > 0)) return { ok: false, erro: "Produto sem preço: cadastre o valor em Editar." };
  const pesoUnitKg = Number(p.peso);
  if (!(pesoUnitKg > 0)) return { ok: false, erro: "Produto sem peso: o veículo depende do peso. Cadastre em Editar → \"Dimensões e peso\"." };

  // Origem = CEP do produto, senão endereço completo da loja (só o CEP o Google
  // às vezes põe no bairro errado).
  const cep = p.cep_produto ? String(p.cep_produto).replace(/\D/g, "").padStart(8, "0") : null;
  const origem = cep
    ? `${cep.slice(0, 5)}-${cep.slice(5)}, Brasil`
    : [[loja.rua, loja.numero].filter(Boolean).join(" "), loja.bairro, loja.cidade, loja.cep].filter(Boolean).join(", ");

  const resultados = await Promise.all(
    e.destinos
      .map((d) => d.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map(async (destino): Promise<ResultadoDestino> => {
        const r = await calcularTrajeto(origem, destino);
        if (!r.ok) return { destino, erro: ERRO_GEO[r.erro] };
        return {
          destino,
          ...simularRegiao({ distanciaM: r.valor.distancia_m, pesoUnitKg, preco, qtd, bandas: e.bandas, porto: e.porto, ajudantes: e.ajudantes, valorAjudante: e.valorAjudante }),
        };
      }),
  );
  return { ok: true, resultados };
}
