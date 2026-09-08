import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mesmo alias do tsconfig: sem ele, todo teste de módulo que importa "@/..."
  // falha na resolução (foi o caso de src/lib/entregas.test.ts).
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
