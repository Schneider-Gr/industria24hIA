// Runner do build-loop. Sequencial; escreve o arquivo só quando o validador
// determinístico passa; MAX_ITER com problemas → não escreve e lista.
// Gate final (tsc/build) fica com o chamador.
// uso: node --experimental-strip-types build-run.ts [filtro-de-path]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp, MAX_ITER, type Spec } from "./build-graph.ts";
import { specs } from "./build-specs.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, "..", "..");

// .env local do loop (mesma chave do design-loop)
for (const linha of readFileSync(join(HERE, ".env"), "utf-8").split("\n")) {
  const i = linha.indexOf("=");
  if (i > 0 && !linha.startsWith("#")) process.env[linha.slice(0, i).trim()] ??= linha.slice(i + 1).trim();
}

// Reescritas de telas existentes do seller (original vai junto na spec)
const CTX = specs[0].contexto;
const rewrites: (Omit<Spec, "original"> & { originalFrom: string })[] = [
  {
    path: "src/app/(seller)/seller/pedidos/page.tsx",
    originalFrom: "src/app/(seller)/seller/pedidos/page.tsx",
    objetivo: `ADICIONE à tela existente: por pedido, listar os itens (linha_itens do pedido:
produto_nome, quantidade, valor, entregue) com um form inline por item chamando a server action
marcarEntrega (importar de "./actions") — botão pequeno "Marcar entregue"/"Desfazer" conforme o
estado. Preserve TODO o resto da tela (KPIs, tabela, filtros que existirem).`,
    contexto: CTX,
    required: ["marcarEntrega", 'from("linha_itens")', "entregue"],
  },
  {
    path: "src/app/(seller)/seller/promocoes/actions.ts",
    originalFrom: "",
    objetivo: `Server actions: criarPromocao(formData) — getMinhaLoja p/ validar sessão; lê produto_id,
min_qtd, valor_unitario; insere promocoes_progressivas {produto_id, faixas: [{min_qtd, valor_unitario}],
ativo: true} (RLS garante que só produto da própria loja passa). alternarPromocao(formData) — lê id e
ativo, update do campo ativo. revalidatePath("/seller/promocoes") nos dois.`,
    contexto: CTX,
    required: ['"use server"', 'from("promocoes_progressivas")', "revalidatePath", "min_qtd", "valor_unitario"],
  },
  {
    path: "src/app/(seller)/seller/promocoes/page.tsx",
    originalFrom: "src/app/(seller)/seller/promocoes/page.tsx",
    objetivo: `ADICIONE à tela existente: (1) form "Nova promoção" (select de produto da loja, inputs
numéricos min_qtd e valor_unitario, botão laranja) chamando criarPromocao de "./actions";
(2) botão por linha "Ativar/Desativar" chamando alternarPromocao. Preserve o restante.`,
    contexto: CTX,
    required: ["criarPromocao", "alternarPromocao", "min_qtd", "valor_unitario"],
  },
  {
    path: "src/app/(seller)/seller/venda-futura/actions.ts",
    originalFrom: "",
    objetivo: `Server actions: criarVendaFutura(formData) — lê produto_id, previsao (date) e estoque;
insere em vendas_futuras. removerVendaFutura(formData) — lê id, delete. RLS escopa ao dono.
revalidatePath("/seller/venda-futura").`,
    contexto: CTX,
    required: ['"use server"', 'from("vendas_futuras")', "revalidatePath", "previsao"],
  },
  {
    path: "src/app/(seller)/seller/venda-futura/page.tsx",
    originalFrom: "src/app/(seller)/seller/venda-futura/page.tsx",
    objetivo: `ADICIONE à tela existente: form "Nova venda futura" (select produto da loja, date previsao,
number estoque) com criarVendaFutura de "./actions", e botão "Remover" por linha com removerVendaFutura.
Preserve o restante.`,
    contexto: CTX,
    required: ["criarVendaFutura", "removerVendaFutura", "previsao"],
  },
  {
    path: "src/app/(seller)/seller/afiliados/actions.ts",
    originalFrom: "",
    objetivo: `Server action moderarAfiliacao(formData): lê id e status ("Aprovada"|"Suspensa"),
update afiliacoes.status (RLS: policies por produto/loja do dono garantem escopo).
revalidatePath("/seller/afiliados").`,
    contexto: CTX,
    required: ['"use server"', 'from("afiliacoes")', "revalidatePath", "Aprovada"],
  },
  {
    path: "src/app/(seller)/seller/afiliados/page.tsx",
    originalFrom: "src/app/(seller)/seller/afiliados/page.tsx",
    objetivo: `ADICIONE à tela existente: buscar também afiliações por loja_id da loja (além das por
produto) e por linha um par de botões "Aprovar"/"Suspender" (form com moderarAfiliacao de "./actions").
Preserve o restante.`,
    contexto: CTX,
    required: ["moderarAfiliacao", "loja_id"],
  },
];

const todas: Spec[] = [
  ...specs,
  ...rewrites.map((r) => ({
    ...r,
    original: r.originalFrom ? readFileSync(join(WEB, r.originalFrom), "utf-8") : undefined,
  })),
];

const filtro = process.argv[2];
const fila = filtro ? todas.filter((s) => s.path.includes(filtro)) : todas;

let falhas = 0;
for (const spec of fila) {
  const t0 = Date.now();
  const fin = await buildApp.invoke({ spec }, { recursionLimit: MAX_ITER * 2 + 4 });
  const s = ((Date.now() - t0) / 1000).toFixed(0);
  if (fin.problemas.length === 0 && fin.codigo) {
    const abs = join(WEB, spec.path);
    if (!existsSync(dirname(abs))) mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, fin.codigo.endsWith("\n") ? fin.codigo : fin.codigo + "\n", "utf-8");
    console.log(`OK   ${spec.path} (${fin.iteracoes} iter, ${s}s)`);
  } else {
    falhas++;
    console.log(`FAIL ${spec.path} (${fin.iteracoes} iter, ${s}s):`);
    for (const p of fin.problemas) console.log(`     - ${p}`);
  }
}
console.log(`\n${fila.length - falhas}/${fila.length} arquivos gerados.`);
process.exit(falhas ? 2 : 0);
