import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { autenticar } from "./auth.js";
import { buildServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3333);
const HOST = process.env.HOST ?? "0.0.0.0";
const allowedHosts = (process.env.ALLOWED_HOSTS ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

const app = express();
app.use(express.json());

const jsonRpcError = (code: number, message: string) => ({
  jsonrpc: "2.0", error: { code, message }, id: null,
});

// MCP Streamable HTTP stateless: cada POST é independente e carrega o Bearer.
app.post("/mcp", async (req, res) => {
  const ctx = await autenticar(req.header("authorization"), "read");
  if (!ctx) {
    res.status(401).json(jsonRpcError(-32001, "Token ausente, inválido, revogado ou expirado."));
    return;
  }
  const ip = req.header("x-forwarded-for") ?? req.socket.remoteAddress ?? null;
  const server = buildServer(ctx, ip);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    ...(allowedHosts.length > 0
      ? { enableDnsRebindingProtection: true, allowedHosts }
      : {}),
  });
  res.on("close", () => { transport.close(); server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (!res.headersSent) res.status(500).json(jsonRpcError(-32603, "Erro interno."));
    console.error("Erro no handleRequest:", err);
  }
});

// Stateless: GET/DELETE (SSE de sessão) não se aplicam.
app.get("/mcp", (_req, res) => res.status(405).json(jsonRpcError(-32000, "Método não permitido.")));
app.delete("/mcp", (_req, res) => res.status(405).json(jsonRpcError(-32000, "Método não permitido.")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, HOST, () => {
  console.error(`industria24-mcp-server ouvindo em http://${HOST}:${PORT}/mcp`);
});
