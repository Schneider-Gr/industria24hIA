"use server";

// Botão avião do produto (decisão da dona, 25/09/2026): o seller define o R$/km
// e a quantidade mínima do produto, e o simulador mostra o frete para perto,
// médio e longe e a quantidade mínima viável. O piso por km vem da loja (0193,
// com trigger que também barra valor abaixo dele).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { calcularTrajeto } from "@/lib/geo";
import { simularDestino, type Extras } from "@/lib/logistica-parceiro/simulador-km";

const reais = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const numero = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim().replace(",", "."));

export type KmState = { ok: boolean; erro?: string; msg?: string };

export async function salvarKmProduto(_prev: KmState, formData: FormData): Promise<KmState> {
  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, erro: "Faça login com a conta da loja." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, erro: "Produto inválido." };
  const desligar = formData.get("acao") === "desligar";
  const valorKm = numero(formData.get("valor_km"));
  const qtdMinima = numero(formData.get("quantidade_minima"));

  if (!desligar) {
    if (!(valorKm >= loja.piso_km_afiliado)) {
      return { ok: false, erro: `O valor por km não pode ficar abaixo do piso da loja (${reais(loja.piso_km_afiliado)}).` };
    }
    if (!(Number.isInteger(qtdMinima) && qtdMinima >= 1)) return { ok: false, erro: "Quantidade mínima deve ser um número inteiro a partir de 1." };
  }

  const supabase = await createClient();
  // Desligar mantém R$/km e quantidade mínima, para religar sem digitar de novo.
  const { data, error } = await supabase
    .from("produtos")
    .update(
      desligar
        ? { permite_logistica_afiliado: false }
        : { permite_logistica_afiliado: true, valor_km_afiliado: valorKm, quantidade_minima: qtdMinima },
    )
    .eq("id", id)
    .eq("loja_id", loja.id)
    .select("id");
  if (error) return { ok: false, erro: error.message };
  if (!data?.length) return { ok: false, erro: "Produto não encontrado nesta loja." };

  revalidatePath("/seller/produtos");
  return {
    ok: true,
    msg: desligar ? "Entrega por parceiro desligada." : `Salvo: ${reais(valorKm)} por km, mínimo de ${qtdMinima} un. por pedido.`,
  };
}

export type ResultadoDestino =
  | { destino: string; erro: string }
  | ({ destino: string } & ReturnType<typeof simularDestino>);
export type SimulacaoState = { ok: false; erro: string } | { ok: true; resultados: ResultadoDestino[] };

const ERRO_GEO: Record<string, string> = {
  nao_configurado: "Integração com o Google Maps pendente (sem chave no servidor).",
  sem_rota: "Sem rota de carro até esse destino (confira o CEP do produto em Editar).",
  teto_de_custo: "Limite diário de consultas ao Google Maps atingido. Tente amanhã.",
  provedor_indisponivel: "Google Maps indisponível agora. Tente de novo em instantes.",
};

// Só seller: cada destino é uma consulta paga na Routes API.
export async function simularKmProduto(
  e: { produtoId: string; valorKm: number; qtd: number; destinos: string[] } & Extras,
): Promise<SimulacaoState> {
  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, erro: "O simulador é do painel do seller: entre com a conta da loja." };
  if (!(e.valorKm >= loja.piso_km_afiliado)) {
    return { ok: false, erro: `O valor por km não pode ficar abaixo do piso da loja (${reais(loja.piso_km_afiliado)}).` };
  }
  const qtd = Math.max(1, Math.floor(e.qtd));

  const supabase = await createClient();
  const { data: p, error } = await supabase
    .from("produtos")
    .select("valor, cep_produto")
    .eq("id", e.produtoId)
    .eq("loja_id", loja.id)
    .maybeSingle();
  if (error) return { ok: false, erro: error.message };
  if (!p) return { ok: false, erro: "Produto não encontrado nesta loja." };
  const preco = Number(p.valor);
  if (!(preco > 0)) return { ok: false, erro: "Produto sem preço: cadastre o valor em Editar." };

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
          ...simularDestino({ distanciaM: r.valor.distancia_m, valorKm: e.valorKm, preco, qtd, porto: e.porto, ajudantes: e.ajudantes, valorAjudante: e.valorAjudante }),
        };
      }),
  );
  return { ok: true, resultados };
}
