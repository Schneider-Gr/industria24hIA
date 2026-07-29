// Runner do loop de design. Sequencial (respeita rate limit), escreve o arquivo
// só quando o validador passa; se bater MAX_ITER com problemas, mantém o
// original e lista o que faltou. Gate final: `tsc --noEmit` fica a cargo do
// chamador (determinístico, repo inteiro).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { app, MAX_ITER } from "./graph.ts";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Em worktree git (.claude/worktrees/<nome>/), node_modules não existe local —
// vive 3 níveis acima, na raiz real do repo. Sobe até achar o binário.
function resolverTsc(): string {
  const nomes = process.platform === "win32" ? ["tsc.cmd", "tsc"] : ["tsc"];
  let dir = WEB;
  for (let i = 0; i < 5; i++) {
    for (const nome of nomes) {
      const candidato = join(dir, "node_modules", ".bin", nome);
      if (existsSync(candidato)) return candidato;
    }
    dir = join(dir, "..");
  }
  throw new Error("tsc não encontrado em node_modules/.bin subindo 5 níveis a partir de " + WEB);
}
const TSC = resolverTsc();

const alvos = process.argv.slice(2);
if (!alvos.length) {
  console.error("uso: node --experimental-strip-types run.ts <arquivos relativos a web/>");
  process.exit(1);
}

// ponytail: guarda contra sobrescrever edits não commitados e contra export
// quebrado que só o comentário/callsite ainda cita — aborta antes de gravar.
function arquivoSujo(rel: string): boolean {
  return execSync(`git status --porcelain -- "${rel}"`, { cwd: WEB }).toString().trim().length > 0;
}

let falhas = 0;
for (const rel of alvos) {
  if (arquivoSujo(rel)) {
    falhas++;
    console.log(`FAIL ${rel} — working tree sujo (edits não commitados), pulado sem gravar.`);
    continue;
  }
  const abs = join(WEB, rel);
  const original = readFileSync(abs, "utf-8");
  const t0 = Date.now();
  const fin = await app.invoke(
    { filePath: rel, original },
    { recursionLimit: MAX_ITER * 2 + 4 },
  );
  const s = ((Date.now() - t0) / 1000).toFixed(0);
  if (fin.problemas.length === 0 && fin.codigo) {
    const conteudo = fin.codigo.endsWith("\n") ? fin.codigo : fin.codigo + "\n";
    writeFileSync(abs, conteudo, "utf-8");
    try {
      execSync(`"${TSC}" --noEmit`, { cwd: WEB, stdio: "pipe" });
    } catch (e) {
      writeFileSync(abs, original, "utf-8");
      falhas++;
      const saida = e instanceof Error && "stdout" in e ? String((e as { stdout: Buffer }).stdout) : String(e);
      console.log(`FAIL ${rel} — tsc --noEmit falhou após a reescrita, revertido ao original.\n${saida}`);
      continue;
    }
    console.log(`OK   ${rel} (${fin.iteracoes} iter, ${s}s)`);
  } else {
    falhas++;
    console.log(`FAIL ${rel} (${fin.iteracoes} iter, ${s}s) — mantido original:`);
    for (const p of fin.problemas) console.log(`     - ${p}`);
  }
}
console.log(`\n${alvos.length - falhas}/${alvos.length} arquivos aplicados.`);
process.exit(falhas ? 2 : 0);
