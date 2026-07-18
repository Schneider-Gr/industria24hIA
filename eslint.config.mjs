import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // CepBar precisa ler o cookie de CEP só depois de montar (evita
    // hydration mismatch, ver comentário no arquivo) — setState num efeito
    // de leitura pontual pós-mount é o padrão certo aqui, a regra do React
    // Compiler não distingue esse caso do de sync loop real.
    files: ["src/components/vitrine/CepBar.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Sub-pacote independente com toolchain/deps próprias (express etc.).
    "mcp-server/**",
  ]),
]);

export default eslintConfig;
