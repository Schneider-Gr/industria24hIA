"use server";

import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// Curadoria de produto por IA (Claude Haiku, escolha explícita do dono por
// custo): descrição otimizada + palavras-chave de SEO + preço sugerido com
// base nos produtos aprovados da mesma categoria. NADA é gravado aqui — o
// resultado volta pro form e o seller decide aplicar.
export type CuradoriaResult = {
  ok: boolean;
  error?: string;
  descricao?: string;
  seo_keywords?: string[];
  preco_sugerido?: number;
  preco_justificativa?: string;
};

const SCHEMA = {
  type: "object" as const,
  properties: {
    descricao: {
      type: "string" as const,
      description: "Descrição de venda otimizada, 2-4 frases, pt-BR, sem exageros",
    },
    seo_keywords: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "6 a 10 palavras-chave de busca, minúsculas, pt-BR",
    },
    preco_sugerido: {
      type: "number" as const,
      description: "Preço unitário sugerido em reais",
    },
    preco_justificativa: {
      type: "string" as const,
      description: "1 frase explicando o preço sugerido vs concorrentes",
    },
  },
  required: ["descricao", "seo_keywords", "preco_sugerido", "preco_justificativa"],
  additionalProperties: false as const,
};

export async function gerarCuradoriaProduto(produtoId: string): Promise<CuradoriaResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "IA não configurada: falta ANTHROPIC_API_KEY no ambiente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  // Mesmo guard de dono usado nas outras actions de produto.
  const { data: produto } = await supabase
    .from("produtos")
    .select("id, nome, descricao, valor, categoria_id, lojas!inner(owner_id)")
    .eq("id", produtoId)
    .eq("lojas.owner_id", user.id)
    .maybeSingle();
  if (!produto) return { ok: false, error: "Produto não encontrado." };

  // Comparáveis: produtos aprovados da mesma categoria (ou geral, se sem categoria).
  let query = supabase
    .from("produtos")
    .select("nome, valor")
    .eq("status_produto", "Aprovado")
    .neq("id", produtoId)
    .limit(15);
  if (produto.categoria_id) query = query.eq("categoria_id", produto.categoria_id);
  const { data: similares } = await query;

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            "Você é curador de catálogo de um marketplace B2B industrial de Manaus (Indústria 24h).",
            "Produto a otimizar:",
            `- Nome: ${produto.nome}`,
            `- Descrição atual: ${produto.descricao ?? "(vazia)"}`,
            `- Preço atual: R$ ${produto.valor}`,
            "",
            "Produtos concorrentes/similares no marketplace (nome | preço R$):",
            ...(similares ?? []).map((s) => `- ${s.nome} | ${s.valor}`),
            "",
            "Gere: descrição de venda otimizada (pt-BR, honesta, focada em comprador B2B),",
            "palavras-chave de SEO para busca interna, e um preço unitário sugerido",
            "competitivo com justificativa de 1 frase.",
          ].join("\n"),
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "IA não retornou resultado." };
    }
    const parsed = JSON.parse(textBlock.text) as {
      descricao: string;
      seo_keywords: string[];
      preco_sugerido: number;
      preco_justificativa: string;
    };
    return { ok: true, ...parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha na chamada de IA." };
  }
}

// Geração de imagem do produto a partir da descrição. Pipeline em 2 etapas:
// (1) Claude (ANTHROPIC_API_KEY, já usado na curadoria) transforma nome+descrição
// num prompt visual de foto de produto e-commerce; (2) gpt-image-1 da OpenAI gera a
// imagem via REST (sem SDK extra). A Anthropic NÃO gera imagem — por isso a 2ª
// etapa exige OPENAI_API_KEY. Sem essa chave o botão devolve o prompt e avisa
// "pendente" (nada de mock, conforme CLAUDE.md). A imagem sobe no mesmo bucket
// "produtos" usado pelo upload manual. Funciona antes do produto existir (form
// de cadastro): recebe o texto direto e devolve a URL pública pro form gravar.
export type ImagemResult = {
  ok: boolean;
  error?: string;
  pendente?: boolean; // faltou OPENAI_API_KEY; prompt volta pra referência
  prompt?: string;
  url?: string;
};

// Chave da OpenAI: aceita o nome convencional e o "openai" já cadastrado no
// Vercel (a env de produção foi criada com esse nome, mesmo caso do Gemini antes).
function openaiKey(): string | undefined {
  return process.env.OPENAI_API_KEY ?? process.env.openai;
}

// Ponto único de troca de provedor de imagem. Retorna PNG em base64 ou lança.
async function gerarImagemBytes(prompt: string): Promise<string> {
  const key = openaiKey();
  if (!key) throw new Error("sem OPENAI_API_KEY");
  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      n: 1,
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI images ${resp.status}: ${await resp.text()}`);
  const data = (await resp.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI não retornou imagem.");
  return b64;
}

async function refinarPromptImagem(nome: string, descricao: string): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          "Escreva UM prompt em inglês para gerar a FOTO de catálogo deste produto industrial/B2B.",
          "Estilo: foto de produto realista, fundo branco neutro de e-commerce, luz de estúdio,",
          "produto centralizado, sem texto, sem logo, sem pessoas. Só o prompt, sem aspas.",
          `Produto: ${nome}`,
          `Descrição: ${descricao}`,
        ].join("\n"),
      },
    ],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" && textBlock.text.trim()
    ? textBlock.text.trim()
    : `Professional e-commerce product photo of ${nome}, ${descricao}, white studio background, no text`;
}

export async function gerarImagemProduto(
  nome: string,
  descricao: string,
): Promise<ImagemResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "IA não configurada: falta ANTHROPIC_API_KEY no ambiente." };
  }
  if (!descricao.trim() && !nome.trim()) {
    return { ok: false, error: "Preencha o nome e a descrição antes de gerar a imagem." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  // Mesmo guard de dono do criarProduto: a loja tem que ser do usuário logado.
  const { data: loja } = await supabase
    .from("lojas")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!loja) return { ok: false, error: "Cadastre sua loja antes de gerar imagens." };

  let prompt: string;
  try {
    prompt = await refinarPromptImagem(nome, descricao);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao montar o prompt." };
  }

  if (!openaiKey()) {
    return {
      ok: false,
      pendente: true,
      prompt,
      error: "Geração de imagem pendente: adicione OPENAI_API_KEY no ambiente para ativar.",
    };
  }

  try {
    const b64 = await gerarImagemBytes(prompt);
    const bytes = Buffer.from(b64, "base64");
    // ponytail: sem checagem de magic bytes aqui — os bytes vêm da resposta da
    // OpenAI, não de upload do usuário; validar quando a fonte deixar de ser confiável.
    const path = `${loja.id}/ia-${randomUUID()}.png`;
    const { error: upErr } = await supabase.storage
      .from("produtos")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (upErr) return { ok: false, error: `Upload falhou: ${upErr.message}` };
    const url = supabase.storage.from("produtos").getPublicUrl(path).data.publicUrl;
    return { ok: true, url, prompt };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha na geração da imagem." };
  }
}
