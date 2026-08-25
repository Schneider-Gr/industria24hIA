#!/usr/bin/env node
// Auditoria de integridade de dependências diretas (PRD 028).
//
// Para cada dependência de `dependencies` no package.json, compara o
// tarball publicado no npm (na versão travada no lockfile) contra o
// snapshot do repositório declarado como origem, na tag correspondente.
// Divergência de conteúdo é reportada, nunca falha o processo — é sinal
// para triagem humana, não gate de CI.
//
// Requer os binários `npm`, `git` e `tar` no PATH (todos presentes por
// padrão no runner ubuntu-latest usado pelo workflow que chama este script).
//
// Ver docs/prds/028-auditoria-periodica-integridade-dependencias.md.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// Arquivos/diretórios ignorados na comparação: metadados de VCS e
// artefatos que legitimamente diferem entre repo-fonte e tarball publicado.
// package.json é excluído por natureza: o próprio registry npm injeta
// campos no publish (gitHead, _nodeVersion, dist, readme etc.), então
// SEMPRE diverge do package.json do repositório -- comparar isso é ruído
// garantido, nunca sinal de comprometimento.
const IGNORE_PATTERNS = [/^\.git\//, /^\.github\//, /^node_modules\//, /(^|\/)\.DS_Store$/, /^package\.json$/];

function sh(cmd, args, opts = {}) {
  // No Windows, `npm`/`npx` são shims .cmd — execFileSync sem shell falha
  // com ENOENT. No runner Linux (ubuntu-latest) isso é inofensivo.
  const needsShell = process.platform === "win32" && (cmd === "npm" || cmd === "npx");
  return execFileSync(cmd, args, { encoding: "utf8", shell: needsShell, ...opts });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function shouldIgnore(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  return IGNORE_PATTERNS.some((re) => re.test(normalized));
}

function hashTree(dir) {
  const hashes = new Map();

  function walk(current, prefix) {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const rel = prefix ? `${prefix}/${entry}` : entry;
      if (shouldIgnore(rel)) continue;
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full, rel);
      } else {
        hashes.set(rel, createHash("sha256").update(readFileSync(full)).digest("hex"));
      }
    }
  }

  walk(dir, "");
  return hashes;
}

function npmViewRepositoryUrl(pkg) {
  try {
    const raw = sh("npm", ["view", pkg, "repository.url", "--json"]).trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    return null;
  }
}

function resolveGithubRepo(pkg) {
  const url = npmViewRepositoryUrl(pkg);
  if (!url) return null;
  const m = String(url).match(/github\.com[:/]+([^/]+)\/([^/.]+?)(\.git)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

function firstExistingTag(owner, repo, version) {
  const candidates = [`v${version}`, version];
  for (const tag of candidates) {
    try {
      sh("git", [
        "ls-remote",
        "--exit-code",
        "--tags",
        `https://github.com/${owner}/${repo}.git`,
        `refs/tags/${tag}`,
      ]);
      return tag;
    } catch {
      continue;
    }
  }
  return null;
}

function downloadAndExtractTarball(pkg, version, destDir) {
  mkdirSync(destDir, { recursive: true });
  const packOut = sh("npm", ["pack", `${pkg}@${version}`, "--pack-destination", destDir]).trim();
  const tarballName = packOut.split("\n").pop().trim();
  sh("tar", ["xf", tarballName], { cwd: destDir });
  return join(destDir, "package"); // convenção do npm: tarball extrai sempre para ./package
}

function cloneAtTag(owner, repo, tag, destDir) {
  // core.autocrlf desligado explicitamente: no Windows ele reescreve LF -> CRLF
  // no checkout, o que gera divergência de hash puramente de line-ending contra
  // o tarball do npm (que preserva os bytes originais). Sem isso o script produz
  // falso-positivo sistemático fora do runner Linux do workflow.
  sh("git", [
    "-c",
    "core.autocrlf=false",
    "clone",
    "--quiet",
    "--depth",
    "1",
    "--branch",
    tag,
    `https://github.com/${owner}/${repo}.git`,
    destDir,
  ]);
}

function auditPackage(name, lockedVersion) {
  const repo = resolveGithubRepo(name);
  if (!repo) {
    return { name, status: "sem-comparacao", motivo: "repository.url ausente ou não aponta para GitHub" };
  }

  const tag = firstExistingTag(repo.owner, repo.repo, lockedVersion);
  if (!tag) {
    return {
      name,
      status: "sem-comparacao",
      motivo: `sem tag correspondente à versão ${lockedVersion} em ${repo.owner}/${repo.repo}`,
    };
  }

  const workDir = mkdtempSync(join(tmpdir(), "audit-dep-"));
  try {
    const npmDir = join(workDir, "npm");
    const repoDir = join(workDir, "repo");
    const tarballRoot = downloadAndExtractTarball(name, lockedVersion, npmDir);
    cloneAtTag(repo.owner, repo.repo, tag, repoDir);

    const tarballHashes = hashTree(tarballRoot);
    const repoHashes = hashTree(repoDir);

    const diffs = [];
    for (const [file, hash] of tarballHashes) {
      const repoHash = repoHashes.get(file);
      // Arquivo só existe no tarball (ex.: dist/ gerado no build de publicação)
      // não conta como divergência — é build output esperado.
      if (repoHash === undefined) continue;
      if (repoHash !== hash) diffs.push(file);
    }

    // Falso-positivo esperado e documentado (PRD 028, seção "Não fazer"):
    // pacotes publicados a partir de um subdiretório de monorepo (ex.: zod
    // publica de packages/zod/, não da raiz) vão sempre divergir aqui,
    // porque comparamos contra a raiz do clone. Fica para triagem humana
    // -- não vale a complexidade de detectar o subpath automaticamente
    // para a primeira versão desta auditoria.
    return diffs.length === 0 ? { name, status: "ok", tag } : { name, status: "divergente", tag, diffs };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function lockedVersionOf(pkgJson, lock, name) {
  return lock.packages?.[`node_modules/${name}`]?.version ?? pkgJson.dependencies[name].replace(/^[\^~]/, "");
}

function main() {
  const pkgJson = readJson(join(ROOT, "package.json"));
  const lock = readJson(join(ROOT, "package-lock.json"));
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;
  const deps = Object.keys(pkgJson.dependencies ?? {}).filter((d) => !only || only.has(d));

  const results = [];
  for (const name of deps) {
    const lockedVersion = lockedVersionOf(pkgJson, lock, name);
    console.error(`Auditando ${name}@${lockedVersion}...`);
    try {
      results.push(auditPackage(name, lockedVersion));
    } catch (err) {
      results.push({ name, status: "erro", motivo: err.message });
    }
  }

  console.log(JSON.stringify(results, null, 2));

  const divergentes = results.filter((r) => r.status === "divergente");
  if (divergentes.length > 0) {
    console.error(`\n${divergentes.length} pacote(s) com divergência entre tarball publicado e repositório.`);
    process.exitCode = 2; // sinaliza ao workflow que há achado a triar, sem quebrar o job (ver .github/workflows)
  }
}

main();
