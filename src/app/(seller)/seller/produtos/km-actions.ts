"use server";

// Botão avião de cada produto: três bandas de frete (moto, carro, caminhão)
// com tarifa mínima e R$/km, e o simulador de quantidade que ajuda o seller a
// descobrir esses valores (dona, 25/09/2026; migration 0201). O check da 0201
// também barra R$/km abaixo do piso, então validarBandas é para a mensagem.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { calcularTrajeto } from "@/lib/geo";
import {
  CLASSES,
  classePorPeso,
  freteTabela,
  pesos,
  simularProduto,
  soDigitosCep,
  sugerirMinimo,
  sugerirValorKm,
  validarBandas,
  valorKmTeto,
  colunasDasBandas,
  type Bandas,
  type Classe,
  type Extras,
  type FaixaFrete,
  type Simulacao,
} from "@/lib/logistica-parceiro/simulador-produto";
import { cotarMelhorEnvio, MAX_QTD_MELHOR_ENVIO } from "@/lib/melhor-envio";

export type BandasState = { ok: boolean; erro?: string; msg?: string };

export async function salvarBandas(_prev: BandasState, formData: FormData): Promise<BandasState> {
  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, erro: "Faça login com a conta da loja." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, erro: "Produto inválido." };
  const desligar = formData.get("acao") === "desligar";

  const num = (k: string) => {
    const t = String(formData.get(k) ?? "").trim().replace(",", ".");
    return t === "" ? null : Number(t);
  };
  const bandas = Object.fromEntries(
    CLASSES.map((c) => [c.classe, { tarifaMinima: num(`tarifa_minima_${c.classe}`), valorKm: num(`valor_km_${c.classe}`) }]),
  ) as Bandas;
  if (!desligar) {
    const erros = validarBandas(bandas);
    if (erros.length) return { ok: false, erro: erros.join(" ") };
    if (!CLASSES.some((c) => bandas[c.classe].valorKm != null)) return { ok: false, erro: "Defina o R$/km de pelo menos um veículo." };
  }

  const colunas = colunasDasBandas(bandas);
  const supabase = await createClient();
  // Desligar mantém as bandas guardadas, para religar sem digitar de novo.
  const { data, error } = await supabase
    .from("produtos")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colunas da 0201 fora dos tipos gerados
    .update((desligar ? { permite_logistica_afiliado: false } : { permite_logistica_afiliado: true, ...colunas }) as any)
    .eq("id", id)
    .eq("loja_id", loja.id)
    .select("id");
  if (error) return { ok: false, erro: error.message };
  if (!data?.length) return { ok: false, erro: "Produto não encontrado nesta loja." };

  revalidatePath("/seller/produtos");
  return { ok: true, msg: desligar ? "Entrega por parceiro desligada." : "Bandas salvas e entrega por parceiro ligada." };
}

// Simulador do avião: produto gravado (peso, medidas, preço) + quantidade e
// bandas ainda não salvas, para 3 destinos de referência, por entregador
// parceiro (bandas), transportadora de tabela e Melhor Envio.
export type EntradaSimulacao = { produtoId: string; quantidade: number; bandas: Bandas; destinos: string[] } & Extras;

type Fonte = { valor: number; pct: number; sugestao?: number | null; detalhe?: string } | { motivo: string };
export type ResultadoDestino = {
  destino: string;
  parceiro: (Simulacao & { valorKmTeto?: number }) | { erro: string };
  tabela: Fonte;
  melhorEnvio: Fonte;
};
export type SimulacaoState =
  | { ok: false; erro: string }
  | {
      ok: true;
      qtd: number;
      pedido: number;
      pesos: ReturnType<typeof pesos>;
      resultados: ResultadoDestino[];
      // R$/km sugerido para a banda do veículo que esta quantidade exige
      sugestaoKm: { classe: Classe["classe"]; valorKm: number; destinosAcima: number; destinos: number } | null;
    };

const ERRO_GEO: Record<string, string> = {
  nao_configurado: "Integração com o Google Maps pendente (sem chave no servidor).",
  sem_rota: "Sem rota de carro até esse destino (confira o CEP do produto em Editar).",
  teto_de_custo: "Limite diário de consultas ao Google Maps atingido. Tente amanhã.",
  provedor_indisponivel: "Google Maps indisponível agora. Tente de novo em instantes.",
};
const ERRO_ME: Record<string, string> = {
  nao_configurado: "integração pendente (sem token no servidor)",
  sem_servico: "nenhum serviço atende",
  provedor_indisponivel: "Melhor Envio indisponível agora",
};

// Só seller: cada destino é uma consulta paga na Routes API.
export async function simularAviao(e: EntradaSimulacao): Promise<SimulacaoState> {
  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, erro: "O simulador é do painel do seller: entre com a conta da loja." };

  const supabase = await createClient();
  const { data: p, error: ep } = await supabase
    .from("produtos")
    .select("valor, peso, altura, largura, comprimento, cep_produto")
    .eq("id", e.produtoId)
    .eq("loja_id", loja.id)
    .maybeSingle();
  if (ep) return { ok: false, erro: ep.message };
  if (!p) return { ok: false, erro: "Produto não encontrado nesta loja." };
  const produto = { pesoKg: p.peso, alturaCm: p.altura, larguraCm: p.largura, comprimentoCm: p.comprimento, preco: Number(p.valor) };
  if (!(produto.preco > 0)) return { ok: false, erro: "Produto sem preço: o simulador não calcula quanto o frete pesa no pedido." };

  const { destinos: brutos, quantidade, bandas, ...extras } = e;
  const erros = validarBandas(bandas);
  if (erros.length) return { ok: false, erro: erros.join(" ") };
  // Sem peso/medidas nem chama o Google.
  const base = simularProduto({ produto, quantidadeMinima: quantidade, distanciaM: 0, ...extras });
  if (!base.ok) return { ok: false, erro: `Sem ${base.faltando.join(", ")} o simulador não calcula: preencha em Editar → "Dimensões e peso".` };
  const qtd = base.atual.qtd;
  const pedido = base.atual.pedido;
  const pctDe = (valor: number) => Math.round((valor / pedido) * 100) / 100;

  const { data: faixasRaw, error } = await supabase
    .from("transportadora_faixas_frete")
    .select("transportadora_id, loja_id, cep_destino_inicial, cep_destino_final, peso_min, peso_max, valor, transportadoras!inner(nome, ativo, fonte, loja_id)")
    .eq("ativo", true)
    .eq("transportadoras.ativo", true)
    .eq("transportadoras.fonte", "tabela_importada")
    .or(`loja_id.is.null,loja_id.eq.${loja.id}`);
  if (error) return { ok: false, erro: `Falha ao ler as tabelas de frete: ${error.message}` };
  const nomes = new Map<string, string>();
  const faixas: FaixaFrete[] = (faixasRaw ?? [])
    .filter((f) => f.transportadoras.loja_id == null || f.transportadoras.loja_id === loja.id)
    .map((f) => {
      nomes.set(f.transportadora_id, f.transportadoras.nome);
      return {
        transportadoraId: f.transportadora_id,
        lojaId: f.loja_id,
        cepInicial: String(f.cep_destino_inicial),
        cepFinal: String(f.cep_destino_final),
        pesoMin: Number(f.peso_min),
        pesoMax: Number(f.peso_max),
        valor: Number(f.valor),
      };
    });

  // Origem = CEP do produto, senão endereço completo da loja (0199; só o CEP
  // o Google às vezes põe no bairro errado).
  const cepProduto = p.cep_produto ? soDigitosCep(String(p.cep_produto)) : null;
  const cepOrigem = cepProduto ?? (loja.cep ? soDigitosCep(String(loja.cep)) : null);
  const origem = cepProduto
    ? `${cepProduto.slice(0, 5)}-${cepProduto.slice(5)}, Brasil`
    : [[loja.rua, loja.numero].filter(Boolean).join(" "), loja.bairro, loja.cidade, loja.cep].filter(Boolean).join(", ");
  const destinos = brutos.map((d) => d.trim()).filter(Boolean).slice(0, 3);

  const resultados = await Promise.all(
    destinos.map(async (destino): Promise<ResultadoDestino> => {
      const cep = destino.match(/\d{5}-?\d{3}/)?.[0] ?? null;

      const tabela: Fonte = (() => {
        if (!cep) return { motivo: "informe o CEP no destino" };
        if (!faixas.length) return { motivo: "sem tabela cadastrada" };
        const t = freteTabela(faixas, loja.id, cep, pesos(produto, qtd).cobrado);
        const sugestao = sugerirMinimo(qtd, produto.preco, (q) => freteTabela(faixas, loja.id, cep, pesos(produto, q).cobrado)?.valor ?? null);
        if (!t) return { motivo: sugestao ? `nenhuma faixa atende ${qtd} un.; a partir de ${sugestao} un. fica em até 20%` : "nenhuma faixa atende este CEP e peso" };
        return { valor: t.valor, pct: pctDe(t.valor), sugestao, detalhe: nomes.get(t.transportadoraId) };
      })();

      const melhorEnvio: Fonte = await (async () => {
        if (!cep || !cepOrigem) return { motivo: cep ? "loja sem CEP" : "informe o CEP no destino" };
        if (qtd > MAX_QTD_MELHOR_ENVIO) return { motivo: `até ${MAX_QTD_MELHOR_ENVIO} un. por cotação` };
        const c = await cotarMelhorEnvio({
          cepOrigem,
          cepDestino: cep,
          produto: { alturaCm: produto.alturaCm!, larguraCm: produto.larguraCm!, comprimentoCm: produto.comprimentoCm!, pesoKg: produto.pesoKg!, preco: produto.preco },
          quantidade: qtd,
        });
        // ponytail: cotação só na quantidade simulada; sugerir exigiria uma chamada por quantidade.
        return c.ok ? { valor: c.valor, pct: pctDe(c.valor), detalhe: c.servico } : { motivo: ERRO_ME[c.erro] };
      })();

      const r = await calcularTrajeto(origem, destino);
      if (!r.ok) return { destino, parceiro: { erro: ERRO_GEO[r.erro] }, tabela, melhorEnvio };
      const sim = simularProduto({ produto, quantidadeMinima: qtd, distanciaM: r.valor.distancia_m, bandas, ...extras });
      return { destino, parceiro: { ...sim, valorKmTeto: valorKmTeto({ distanciaM: r.valor.distancia_m, pedido, ...extras }) }, tabela, melhorEnvio };
    }),
  );
  const distanciasM = resultados.flatMap((r) => ("ok" in r.parceiro && r.parceiro.ok ? [r.parceiro.atual.frete.km * 1000] : []));
  const classe = classePorPeso(base.atual.pesos.real);
  const sugestaoKm = distanciasM.length
    ? { classe: classe.classe, destinos: distanciasM.length, ...sugerirValorKm({ distanciasM, pedido, pisoKm: classe.pisoKm, ...extras }) }
    : null;
  return { ok: true, qtd, pedido, pesos: base.atual.pesos, resultados, sugestaoKm };
}

