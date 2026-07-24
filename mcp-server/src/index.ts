#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Faltam envs: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)."
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const server = new McpServer({ name: "industria24h-mcp", version: "0.1.0" });

// ponytail: leitura genérica table-driven em vez de um tool por tabela.
const TABLES = {
  produtos: "produtos",
  lojas: "lojas",
  categorias: "categorias",
  subcategorias: "subcategorias",
  pedidos: "pedidos",
  linha_itens: "linha_itens",
  entregas: "entregas",
  vendas_futuras: "vendas_futuras",
  promocoes_progressivas: "promocoes_progressivas",
  afiliacoes: "afiliacoes",
  centros_distribuicao: "centros_distribuicao",
} as const;

const tableEnum = z.enum(
  Object.keys(TABLES) as [keyof typeof TABLES, ...Array<keyof typeof TABLES>]
);

server.tool(
  "listar_registros",
  "Lista registros de uma tabela do marketplace Industria24h (paginado, somente leitura).",
  {
    tabela: tableEnum,
    limite: z.number().int().min(1).max(200).default(20),
    offset: z.number().int().min(0).default(0),
    filtro_coluna: z.string().optional().describe("Nome da coluna para filtrar por igualdade"),
    filtro_valor: z.string().optional().describe("Valor a comparar com filtro_coluna"),
  },
  async ({ tabela, limite, offset, filtro_coluna, filtro_valor }) => {
    let query = supabase
      .from(TABLES[tabela])
      .select("*")
      .range(offset, offset + limite - 1);

    if (filtro_coluna && filtro_valor !== undefined) {
      query = query.eq(filtro_coluna, filtro_valor);
    }

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "buscar_registro_por_id",
  "Busca um único registro por id em uma tabela do marketplace Industria24h.",
  {
    tabela: tableEnum,
    id: z.string(),
  },
  async ({ tabela, id }) => {
    const { data, error } = await supabase.from(TABLES[tabela]).select("*").eq("id", id).maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: "Nenhum registro encontrado." }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "buscar_produtos",
  "Busca produtos por termo no nome (ilike).",
  {
    termo: z.string(),
    limite: z.number().int().min(1).max(100).default(20),
  },
  async ({ termo, limite }) => {
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .ilike("nome", `%${termo}%`)
      .limit(limite);
    if (error) {
      return { content: [{ type: "text", text: `Erro: ${error.message}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
