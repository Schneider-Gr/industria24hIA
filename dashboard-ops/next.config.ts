import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Fixa a raiz de tracing neste diretório. Sem isso, o Next detecta o
  // monorepo (package-lock.json também em web/) e infere a raiz errada,
  // pegando src/instrumentation.ts do app principal (que não é dependência
  // do dashboard-ops) em vez de tratar este projeto como isolado.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
