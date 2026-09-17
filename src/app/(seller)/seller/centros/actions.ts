"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gerarPosicoes } from "@/lib/estoque/faixa-enderecos";
import type { TablesInsert } from "@/lib/supabase/database.types";

export type CentroFormState = { ok: boolean; error?: string };

// O banco guarda CEP como integer, igual a faixas_cep.cep_inicial (0014) e ao
// v_cep das RPCs de checkout. Texto criaria uma segunda representação de CEP.
function cepParaInteiro(bruto: string | null): number | null | "invalido" {
  const digitos = (bruto ?? "").replace(/\D/g, "");
  if (digitos === "") return null;
  if (digitos.length !== 8) return "invalido";
  const n = Number(digitos);
  // 01000-000 é o menor CEP real; o CHECK da 0176 recusa abaixo disso.
  return n >= 1000000 ? n : "invalido";
}

export async function criarCentro(
  _prev: CentroFormState,
  formData: FormData,
): Promise<CentroFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  // owner_id explícito: a policy pública lojas_public_read (Ativa) combina via OR
  // com a do dono, então sem este filtro isto podia gravar o centro na loja de
  // OUTRO seller (bug real encontrado em QA — ver auth.ts:getMinhaLoja).
  const { data: loja } = await supabase
    .from("lojas")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!loja) return { ok: false, error: "Cadastre sua loja antes de criar centros." };

  const nome = (formData.get("nome") as string | null)?.trim();
  if (!nome) return { ok: false, error: "O nome do centro é obrigatório." };

  const localizacaoRaw = (formData.get("localizacao") as string | null)?.trim();

  const cep = cepParaInteiro(formData.get("cep") as string | null);
  if (cep === "invalido") {
    return { ok: false, error: "CEP inválido. Informe os 8 dígitos." };
  }

  const payload: TablesInsert<"centros_distribuicao"> = {
    loja_id: loja.id,
    nome,
    localizacao: localizacaoRaw || null,
    cep,
  };

  const { error } = await supabase.from("centros_distribuicao").insert(payload);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/seller/centros");
  return { ok: true };
}

// Ícone de lixeira da tabela "Centros adicionados por você" no Bubble.
// Desde a 0175 o centro carrega saldo de estoque e sustenta o invariante de um
// local padrão por loja, então o delete NÃO é mais incondicional: a guarda vive
// no banco (centro_guarda_exclusao) e aqui só traduzimos a recusa para o seller,
// que antes via o botão não fazer nada.
export async function excluirCentro(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: loja } = await supabase
    .from("lojas")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!loja) return;

  const { error } = await supabase
    .from("centros_distribuicao")
    .delete()
    .eq("id", id)
    .eq("loja_id", loja.id);

  revalidatePath("/seller/centros");
  if (error) redirect(`/seller/centros?erro=${encodeURIComponent(error.message)}`);
}

// ============================================================
// Endereços de armazenagem (0176, Milestone 2 do PRD 039)
// ============================================================
// As três actions abaixo não escrevem na tabela: chamam as funções security
// definer da 0176, que resolvem a loja por dono e recusam endereço de centro
// alheio. Erro do banco é a mensagem que o seller lê, porque as mensagens de lá
// já explicam o que fazer (transferir o saldo, informar o motivo).

function erroParaTela(mensagem: string): never {
  redirect(`/seller/centros?erro=${encodeURIComponent(mensagem)}`);
}

export async function criarEndereco(formData: FormData) {
  const centroId = formData.get("centro_id");
  if (typeof centroId !== "string") return;

  const partes = ["rua", "predio", "nivel", "apartamento"].map((campo) =>
    ((formData.get(campo) as string | null) ?? "").trim(),
  );
  if (partes.some((p) => p === "")) {
    erroParaTela("Preencha rua, prédio, nível e apartamento do endereço.");
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC da 0176 fora dos tipos gerados
  const { error } = await (supabase as any).rpc("estoque_endereco_criar", {
    p_centro_id: centroId,
    p_rua: partes[0],
    p_predio: partes[1],
    p_nivel: partes[2],
    p_apartamento: partes[3],
  });

  revalidatePath("/seller/centros");
  if (error) erroParaTela(error.message);
}

export async function alternarBloqueioEndereco(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const bloquear = formData.get("bloquear") === "1";
  const motivo = ((formData.get("motivo") as string | null) ?? "").trim();
  if (bloquear && motivo === "") {
    erroParaTela("Informe o motivo do bloqueio do endereço.");
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC da 0176 fora dos tipos gerados
  const { error } = await (supabase as any).rpc("estoque_endereco_bloquear", {
    p_endereco_id: id,
    p_bloquear: bloquear,
    p_motivo: bloquear ? motivo : null,
  });

  revalidatePath("/seller/centros");
  if (error) erroParaTela(error.message);
}

export async function excluirEndereco(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  // Pela RPC, não por delete direto: a 0176 não tem policy de escrita, então um
  // delete do cliente afetaria zero linhas em silêncio. A guarda de saldo fica no
  // trigger e a mensagem dela é o que o seller lê.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC da 0176 fora dos tipos gerados
  const { error } = await (supabase as any).rpc("estoque_endereco_excluir", {
    p_endereco_id: id,
  });

  revalidatePath("/seller/centros");
  if (error) erroParaTela(error.message);
}

// Cadastro em lote (0181). O galpão nasce vazio e ninguém cadastra 360 posições
// uma a uma, que é por que o CD do Indústria está em produção com zero delas.
// A expansão das faixas roda aqui com a MESMA função que a tela usa na prévia:
// o número que a pessoa confirmou é o número que o banco cria.
export async function criarEnderecosEmLote(formData: FormData) {
  const centroId = formData.get("centro_id");
  if (typeof centroId !== "string") return;

  // Sessão ANTES de expandir. A expansão é trabalho proporcional à entrada, e a
  // checagem de dono mora dentro da RPC, no fim da linha: sem esta guarda, quem
  // não está logado ainda consegue fazer o servidor trabalhar.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) erroParaTela("Sessão expirada. Faça login novamente.");

  const faixas = {
    ruas: ((formData.get("ruas") as string | null) ?? "").trim(),
    predios: ((formData.get("predios") as string | null) ?? "").trim(),
    niveis: ((formData.get("niveis") as string | null) ?? "").trim(),
    apartamentos: ((formData.get("apartamentos") as string | null) ?? "").trim(),
  };

  const expansao = gerarPosicoes(faixas);
  if (!expansao.ok) erroParaTela(expansao.erro);
  // Uma chamada, uma transação. Uma RPC por posição deixaria o galpão meio
  // cadastrado se a rede caísse no meio do lote.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC da 0181 fora dos tipos gerados
  const { data, error } = await (supabase as any).rpc("estoque_enderecos_criar_lote", {
    p_centro_id: centroId,
    // Derivado do MESMO resultado que gerou a prévia. Reexpandir aqui abriria a
    // porta para a contagem confirmada e a lista enviada discordarem.
    p_ruas: [...new Set(expansao.posicoes.map((p) => p.rua))],
    p_predios: [...new Set(expansao.posicoes.map((p) => p.predio))],
    p_niveis: [...new Set(expansao.posicoes.map((p) => p.nivel))],
    p_apartamentos: [...new Set(expansao.posicoes.map((p) => p.apartamento))],
  });

  revalidatePath("/seller/centros");
  if (error) erroParaTela(error.message);

  // Quantas foram puladas importa: repetir o lote com uma rua a mais é o uso
  // normal, e o silêncio faria parecer que nada aconteceu.
  const criadas = (data as number) ?? 0;
  const puladas = expansao.posicoes.length - criadas;
  redirect(
    `/seller/centros?ok=${encodeURIComponent(
      puladas > 0
        ? `${criadas} posição(ões) criada(s), ${puladas} já existia(m).`
        : `${criadas} posição(ões) criada(s).`,
    )}`,
  );
}
