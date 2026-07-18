#!/usr/bin/env node
// Emite um token de parceiro para o MCP Industria24 (uso do ADMIN).
// O token em claro aparece UMA vez no stdout; o banco guarda só o SHA-256.
//
//   node scripts/emitir-token.mjs <read|write> <loja_id> [--partner <uuid>]
//   node scripts/emitir-token.mjs --self-check
//
// Saída: o token (entregue ao parceiro) + o SQL de INSERT (rodar no Supabase).
import crypto from "node:crypto";

const hashToken = (t) => crypto.createHash("sha256").update(t.trim()).digest("hex");

function gerar(escopo) {
  if (escopo !== "read" && escopo !== "write") throw new Error("escopo deve ser read|write");
  const segredo = crypto.randomBytes(24).toString("base64url");
  const token = `i24_${escopo}_${segredo}`;
  return { token, prefixo: token.slice(0, 14), hash: hashToken(token) };
}

if (process.argv.includes("--self-check")) {
  const { token, hash } = gerar("read");
  console.assert(token.startsWith("i24_read_"), "prefixo read");
  console.assert(hash === hashToken(token), "hash determinístico");
  console.assert(gerar("write").token.startsWith("i24_write_"), "prefixo write");
  console.assert(/^[0-9a-f]{64}$/.test(hash), "sha256 hex");
  let erro = false;
  try { gerar("admin"); } catch { erro = true; }
  console.assert(erro, "escopo inválido rejeitado");
  console.log("self-check OK");
  process.exit(0);
}

const [, , escopo, lojaId] = process.argv;
const partnerIdx = process.argv.indexOf("--partner");
const partnerId = partnerIdx > -1 ? process.argv[partnerIdx + 1] : null;

if (!escopo || !lojaId) {
  console.error("Uso: node scripts/emitir-token.mjs <read|write> <loja_id> [--partner <uuid>]");
  process.exit(1);
}

const { token, prefixo, hash } = gerar(escopo);
const aprovacao = escopo === "write"
  ? "aprovada_por = (select user_id from admins limit 1), aprovada_em = now(),"
  : "";

console.log("\n=== ENTREGUE AO PARCEIRO (aparece só agora, não é recuperável) ===");
console.log(token);
console.log("\n=== RODE NO SUPABASE (SQL Editor) ===");
console.log(`insert into public.api_keys (partner_id, loja_id, token_hash, prefixo, escopo, ${escopo === "write" ? "aprovada_por, aprovada_em" : "aprovada_em"})
values (
  ${partnerId ? `'${partnerId}'` : "'<PARTNER_ID>'"},
  '${lojaId}',
  '${hash}',
  '${prefixo}',
  '${escopo}',
  ${escopo === "write" ? "(select user_id from admins limit 1), now()" : "null"}
);`);
if (escopo === "write") console.log("\n(escopo write já nasce aprovado por este SQL — só rode após validar o parceiro.)");
