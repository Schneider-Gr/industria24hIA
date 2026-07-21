import app from "./app.js";

// Modo standalone (self-host / local). Na Vercel quem serve é api/index.js.
const PORT = Number(process.env.PORT ?? 3333);
const HOST = process.env.HOST ?? "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.error(`industria24-mcp-server ouvindo em http://${HOST}:${PORT}/mcp`);
});
