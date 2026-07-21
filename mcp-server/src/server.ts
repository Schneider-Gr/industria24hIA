import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "./supabase.js";
import { registrarUso, type AuthContext } from "./auth.js";

// Tabelas de leitura liberadas (todas somente-leitura para terceiros).
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
  corridas: "corridas",
  corrida_posicoes: "corrida_posicoes",
} as const;

const tableEnum = z.enum(
  Object.keys(TABLES) as [keyof typeof TABLES, ...Array<keyof typeof TABLES>]
);

// Escrita nasce desabilitada; liga por módulo via MCP_WRITE_ENABLED.
// ponytail: flag de string, não feature-flag service — liga catalogo, depois pedidos.
const writeModulos = new Set(
  (process.env.MCP_WRITE_ENABLED ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});
const fail = (msg: string) => ({
  content: [{ type: "text" as const, text: `Erro: ${msg}` }],
  isError: true,
});

export function buildServer(ctx: AuthContext, ip: string | null): McpServer {
  const server = new McpServer({ name: "industria24-mcp-server", version: "0.2.0" });

  // ---------- Leitura (escopo read; write inclui read) ----------
  server.tool(
    "industria24_listar_registros",
    "Lista registros de uma tabela do marketplace Industria24 (paginado, somente leitura).",
    {
      tabela: tableEnum,
      limite: z.number().int().min(1).max(200).default(20),
      offset: z.number().int().min(0).default(0),
      filtro_coluna: z.string().optional().describe("Coluna para filtrar por igualdade"),
      filtro_valor: z.string().optional().describe("Valor comparado com filtro_coluna"),
    },
    { readOnlyHint: true, openWorldHint: true },
    async ({ tabela, limite, offset, filtro_coluna, filtro_valor }) => {
      let q = supabase.from(TABLES[tabela]).select("*", { count: "exact" })
        .range(offset, offset + limite - 1);
      if (filtro_coluna && filtro_valor !== undefined) q = q.eq(filtro_coluna, filtro_valor);
      const { data, error, count } = await q;
      if (error) return fail(error.message);
      return ok({
        registros: data,
        total_count: count,
        has_more: count != null && offset + limite < count,
        next_offset: offset + limite,
      });
    }
  );

  server.tool(
    "industria24_buscar_registro",
    "Busca um único registro por id em uma tabela do marketplace Industria24.",
    { tabela: tableEnum, id: z.string() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ tabela, id }) => {
      const { data, error } = await supabase.from(TABLES[tabela]).select("*").eq("id", id).maybeSingle();
      if (error) return fail(error.message);
      if (!data) return ok({ mensagem: "Nenhum registro encontrado." });
      return ok(data);
    }
  );

  server.tool(
    "industria24_buscar_produtos",
    "Busca produtos por termo no nome (ilike).",
    { termo: z.string(), limite: z.number().int().min(1).max(100).default(20) },
    { readOnlyHint: true, openWorldHint: true },
    async ({ termo, limite }) => {
      const { data, error } = await supabase.from("produtos").select("*").ilike("nome", `%${termo}%`).limit(limite);
      if (error) return fail(error.message);
      return ok(data);
    }
  );

  // Rastreio em tempo real. Devolve no vocabulário RTT do Mercado Envios
  // (transport / locations) para quem já integra aquele padrão: a corrida é o
  // transport, o parceiro é o device, corrida_posicoes são as locations.
  // ponytail: sem telemetria — o app do parceiro só manda lat/lng hoje.
  server.tool(
    "industria24_rastrear_corrida",
    "Posições GPS de uma corrida de logística, da mais recente para a mais antiga, no formato RTT (transport/locations).",
    {
      corrida_id: z.string(),
      limite: z.number().int().min(1).max(200).default(20).describe("Quantas posições retornar"),
    },
    { readOnlyHint: true, openWorldHint: true },
    async ({ corrida_id, limite }) => {
      const { data: corrida, error: erroCorrida } = await supabase
        .from("corridas")
        .select("id, status, parceiro_id, origem_endereco, destino_endereco, pedido_id")
        .eq("id", corrida_id)
        .maybeSingle();
      if (erroCorrida) return fail(erroCorrida.message);
      if (!corrida) return fail("Corrida não encontrada.");

      const { data: posicoes, error } = await supabase
        .from("corrida_posicoes")
        .select("lat, lng, criado_em")
        .eq("corrida_id", corrida_id)
        .order("criado_em", { ascending: false })
        .limit(limite);
      if (error) return fail(error.message);

      const linhas = (posicoes ?? []) as Array<{ lat: number; lng: number; criado_em: string }>;
      return ok({
        transport: {
          id: corrida.id,
          status: corrida.status,
          origem: corrida.origem_endereco,
          destino: corrida.destino_endereco,
          pedido_id: corrida.pedido_id,
        },
        device: { external_entity_id: corrida.parceiro_id, external_entity_type: "PARCEIRO_LOGISTICO" },
        locations: linhas.map((p) => ({
          latitude: p.lat,
          longitude: p.lng,
          timestamp: Math.floor(new Date(p.criado_em).getTime() / 1000),
          date: p.criado_em,
        })),
      });
    }
  );

  // ---------- Escrita (só se o token é 'write' E o módulo está ligado) ----------
  // Ownership sempre por loja_id do token: um parceiro nunca edita loja alheia.
  // Campos financeiros (repasse/comissão/chave_pix/valor_pedido) ficam FORA de
  // propósito — protegidos também pelos guards das migrations 0012/0031/0035.
  if (ctx.escopo === "write") {
    const catalogo = writeModulos.has("catalogo");
    const pedidos = writeModulos.has("pedidos");

    server.tool(
      "industria24_atualizar_produto",
      "Atualiza dados de catálogo de um produto DA LOJA DO PARCEIRO (nome, descrição, preço, sku). Não altera status de moderação nem campos financeiros.",
      {
        id: z.string().describe("id do produto"),
        nome: z.string().optional(),
        descricao: z.string().optional(),
        valor: z.number().positive().optional().describe("preço de venda"),
        sku: z.string().optional(),
      },
      { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      async (args) => {
        if (!catalogo) return guardModulo(ctx, "industria24_atualizar_produto", args, ip, "catalogo");
        const { id, ...campos } = args;
        const patch = Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined));
        if (Object.keys(patch).length === 0) return fail("Nenhum campo para atualizar.");
        const { data, error } = await supabase
          .from("produtos").update(patch).eq("id", id).eq("loja_id", ctx.lojaId).select().maybeSingle();
        return finalizar(ctx, "industria24_atualizar_produto", args, ip, error?.message,
          data ? ok(data) : fail("Produto não encontrado ou não pertence à sua loja."));
      }
    );

    server.tool(
      "industria24_atualizar_estoque",
      "Define o estoque_atual de um produto DA LOJA DO PARCEIRO.",
      { id: z.string(), estoque_atual: z.number().int().min(0) },
      { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      async (args) => {
        if (!catalogo) return guardModulo(ctx, "industria24_atualizar_estoque", args, ip, "catalogo");
        const { data, error } = await supabase
          .from("produtos").update({ estoque_atual: args.estoque_atual })
          .eq("id", args.id).eq("loja_id", ctx.lojaId).select().maybeSingle();
        return finalizar(ctx, "industria24_atualizar_estoque", args, ip, error?.message,
          data ? ok(data) : fail("Produto não encontrado ou não pertence à sua loja."));
      }
    );

    server.tool(
      "industria24_atualizar_status_pedido",
      "Atualiza o status_pedido de um pedido DA LOJA DO PARCEIRO. Não altera valores.",
      { id: z.string(), status_pedido: z.string() },
      { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      async (args) => {
        if (!pedidos) return guardModulo(ctx, "industria24_atualizar_status_pedido", args, ip, "pedidos");
        const { data, error } = await supabase
          .from("pedidos").update({ status_pedido: args.status_pedido })
          .eq("id", args.id).eq("loja_id", ctx.lojaId).select().maybeSingle();
        return finalizar(ctx, "industria24_atualizar_status_pedido", args, ip, error?.message,
          data ? ok(data) : fail("Pedido não encontrado ou não pertence à sua loja."));
      }
    );

    server.tool(
      "industria24_atualizar_entrega",
      "Atualiza status e/ou rastreio de uma entrega (por linha_item_id) de um pedido DA LOJA DO PARCEIRO.",
      {
        linha_item_id: z.string(),
        status: z.enum(["Pendente", "Enviado", "Entregue"]).optional(),
        rastreio: z.string().optional(),
      },
      { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      async (args) => {
        if (!pedidos) return guardModulo(ctx, "industria24_atualizar_entrega", args, ip, "pedidos");
        // Ownership da entrega: linha_item -> pedido -> loja.
        const { data: dono } = await supabase
          .from("entregas")
          .select("linha_item_id, linha_itens!inner(pedidos!inner(loja_id))")
          .eq("linha_item_id", args.linha_item_id).maybeSingle();
        const donoTyped = dono as { linha_itens?: { pedidos?: { loja_id?: string } } } | null;
        const lojaDaEntrega = donoTyped?.linha_itens?.pedidos?.loja_id;
        if (!dono || lojaDaEntrega !== ctx.lojaId) {
          return finalizar(ctx, "industria24_atualizar_entrega", args, ip, "ownership",
            fail("Entrega não encontrada ou não pertence à sua loja."));
        }
        const patch: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
        if (args.status !== undefined) patch.status = args.status;
        if (args.rastreio !== undefined) patch.rastreio = args.rastreio;
        const { data, error } = await supabase
          .from("entregas").update(patch).eq("linha_item_id", args.linha_item_id).select().maybeSingle();
        return finalizar(ctx, "industria24_atualizar_entrega", args, ip, error?.message,
          data ? ok(data) : fail("Falha ao atualizar entrega."));
      }
    );
  }

  return server;
}

// Auditoria + resposta. Registra o uso (sucesso/erro) e devolve a resposta MCP.
async function finalizar(
  ctx: AuthContext, tool: string, params: unknown, ip: string | null,
  erro: string | undefined, resposta: ReturnType<typeof ok> | ReturnType<typeof fail>
) {
  const sucesso = !("isError" in resposta && resposta.isError);
  await registrarUso(ctx, tool, params, sucesso, erro ?? (sucesso ? null : "falha"), ip);
  return erro ? fail(erro) : resposta;
}

async function guardModulo(
  ctx: AuthContext, tool: string, params: unknown, ip: string | null, modulo: string
) {
  await registrarUso(ctx, tool, params, false, `modulo_desabilitado:${modulo}`, ip);
  return fail(`Escrita do módulo '${modulo}' ainda não habilitada nesta plataforma.`);
}
