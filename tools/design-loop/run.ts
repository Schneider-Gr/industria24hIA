// Runner do loop de design. Sequencial (respeita rate limit), escreve o arquivo
// só quando o validador passa; se bater MAX_ITER com problemas, mantém o
// original e lista o que faltou. Gate final: `tsc --noEmit` fica a cargo do
// chamador (determinístico, repo inteiro).

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { app, MAX_ITER } from "./graph.ts";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

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
      execSync("node_modules/.bin/tsc --noEmit", { cwd: WEB, stdio: "pipe" });
    } catch (e) {
      writeFileSync(abs, original, "utf-8");
      falhas++;
      console.log(`FAIL ${rel} — tsc --noEmit falhou após a reescrita, revertido ao original.`);
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
