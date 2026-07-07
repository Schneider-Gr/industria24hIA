// Importa o dump da Data API do Bubble (bubble-export/data/*.json) para o
// Supabase. Idempotente: upsert por bubble_id em tudo; re-rodar não duplica.
// Decisões 2026-07-07: produtos sem preço entram com valor=0; itens órfãos
// (carrinho abandonado) ficam de fora; afiliação carrega loja E produto;
// users criados sem senha (definem via "Esqueci a senha").
// Uso: node scripts/import-bubble.mjs
import { readFileSync } from "fs";
import path from "path";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const DATA = path.resolve("..", "bubble-export", "data");

const load = (f) => {
  const j = JSON.parse(readFileSync(path.join(DATA, f + ".json"), "utf8"));
  return Array.isArray(j) ? j : (j.response?.results ?? j.results ?? []);
};

async function rest(method, pathq, body) {
  const r = await fetch(`${URL_}/rest/v1/${pathq}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${pathq} -> ${r.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

// upsert em lotes; devolve mapa bubble_id -> id
async function upsert(table, rows, conflict = "bubble_id") {
  const map = {};
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const out = await rest("POST", `${table}?on_conflict=${conflict}`, batch);
    for (const r of out) if (r.bubble_id) map[r.bubble_id] = r.id;
  }
  console.log(`${table}: ${rows.length} upserted`);
  return map;
}

const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
const bool = (v) => v === true || v === "yes" || v === "Ativo";

// ---------- 1. Users (Supabase Auth, sem senha) ----------
async function importUsers(users) {
  // já existentes, por e-mail
  const existing = {};
  for (let page = 1; ; page++) {
    const r = await fetch(`${URL_}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    const j = await r.json();
    const list = j.users ?? [];
    for (const u of list) existing[u.email?.toLowerCase()] = u.id;
    if (list.length < 200) break;
  }

  const map = {}; // bubble user _id -> auth uuid
  let created = 0,
    semEmail = 0;
  for (const u of users) {
    const email = u.authentication?.email?.email?.toLowerCase();
    if (!email) {
      semEmail++;
      continue;
    }
    if (existing[email]) {
      map[u._id] = existing[email];
      continue;
    }
    const r = await fetch(`${URL_}/auth/v1/admin/users`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        email_confirm: true,
        user_metadata: { bubble_id: u._id, nome: u.Nome ?? null },
      }),
    });
    const j = await r.json();
    if (!j.id) {
      console.warn(`user ${email}: ${JSON.stringify(j).slice(0, 120)}`);
      continue;
    }
    existing[email] = j.id;
    map[u._id] = j.id;
    created++;
  }
  console.log(`users: ${created} criados, ${Object.keys(map).length} mapeados, ${semEmail} sem e-mail (pulados)`);
  return map;
}

// ---------- main ----------
const users = load("User");
const userMap = await importUsers(users);

// admins reais = SuperADM (6 contas; ver data-api-reconciliation.md §4)
const adminRows = users
  .filter((u) => u.SuperADM === true && userMap[u._id])
  .map((u) => ({ user_id: userMap[u._id] }));
await upsert("admins", adminRows, "user_id");

// categorias (0003 já semeou por nome → conflita por nome, ganha bubble_id)
const catMap = await upsert(
  "categorias",
  load("CategoriaProdutos").map((c) => ({ bubble_id: c._id, nome: c.NomeCategoria })),
  "nome",
).then(async () => {
  const all = await rest("GET", "categorias?select=id,bubble_id");
  return Object.fromEntries(all.filter((c) => c.bubble_id).map((c) => [c.bubble_id, c.id]));
});

const subMap = await upsert(
  "subcategorias",
  load("SubCategoria").map((s) => ({
    bubble_id: s._id,
    nome: s.Nome,
    categoria_id: catMap[s.CategoriaProduto] ?? null,
  })),
);

// lojas — owner: _Dono_Proprietario → Created By → user cujo _Loja aponta pra loja
// (4 lojas de teste não têm dono, mas têm sellers reais via User._Loja)
const lojasRaw = load("Loja_ecommerce");
const ownerByLoja = {};
for (const u of users) if (u._Loja && userMap[u._id] && !ownerByLoja[u._Loja]) ownerByLoja[u._Loja] = userMap[u._id];
const lojaRows = [];
for (const l of lojasRaw) {
  const owner = userMap[l._Dono_Proprietario] ?? userMap[l["Created By"]] ?? ownerByLoja[l._id];
  if (!owner) {
    console.warn(`loja "${l.NomeFantasia}" sem owner mapeável — pulada`);
    continue;
  }
  lojaRows.push({
    bubble_id: l._id,
    owner_id: owner,
    nome: l.NomeFantasia ?? "(sem nome)",
    cnpj: l.CNPJ ?? null,
    razao_social: l.RazaoSocial ?? null,
    descricao: l.DescricaoLoja ?? null,
    logotipo_url: l.Logotipo ?? null,
    banner_url: l.Banner ?? null,
    whatsapp: l.Whatsapp ?? null,
    email: l.Email ?? null,
    chave_pix: l.ChavePix ?? null,
    tipo_chave_pix: ["CNPJ", "CPF", "EMAIL", "PHONE"].includes(l.TipoChavePix) ? l.TipoChavePix : null,
    cep: l.Cep ?? null,
    cidade: l.Cidade ?? null,
    bairro: l.EndBairro ?? null,
    rua: l.endRua ?? null,
    numero: l.endNUM == null ? null : String(l.endNUM),
    estado: l.Estado ?? null,
    complemento: l.complementoEND ?? null,
    permite_retirada_na_loja: bool(l.RetiradaNaLoja),
    valor_pedido_minimo: num(l.ValorPedidoMinimo),
    situacao: l.statusLoja ?? "Inativa",
    created_at: l["Created Date"],
  });
}
const lojaMap = await upsert("lojas", lojaRows);

// centros de distribuição
const centroMap = await upsert(
  "centros_distribuicao",
  load("Centrodedistribuicao")
    .filter((c) => lojaMap[c.LojaDistruibuicao])
    .map((c) => ({
      bubble_id: c._id,
      loja_id: lojaMap[c.LojaDistruibuicao],
      nome: c.Nome ?? "(sem nome)",
      localizacao: c.localizacao ?? null,
      status: c.CentroAtivado === false ? "Inativo" : "Ativo",
    })),
);

// produtos — valor=0 quando sem preço (decisão D-mig1); excluido=true fica fora
const prodsRaw = load("Produto_ecommerce");
// vínculo produto→loja: _LojaProduto → loja do dono (Created By) → loja do
// User._Loja do criador → loja criada pelo criador. 172 produtos do catálogo
// Meta (admin_user_meta_live) não têm loja nenhuma: ficam fora, documentado.
const lojaBubbleByOwner = {};
for (const l of lojasRaw) if (l._Dono_Proprietario) lojaBubbleByOwner[l._Dono_Proprietario] = l._id;
const lojaBubbleByCreator = {};
for (const l of lojasRaw) lojaBubbleByCreator[l["Created By"]] ??= l._id;
const lojaBubbleByUserLoja = {};
for (const u of users) if (u._Loja) lojaBubbleByUserLoja[u._id] = u._Loja;
const lojaDoProduto = (p) => {
  const cb = p["Created By"];
  const bid = p._LojaProduto ?? lojaBubbleByOwner[cb] ?? lojaBubbleByUserLoja[cb] ?? lojaBubbleByCreator[cb];
  return lojaMap[bid];
};
const prodRows = [];
let prodSemLoja = 0,
  prodExcluidos = 0;
for (const p of prodsRaw) {
  if (p.excluido === true) {
    prodExcluidos++;
    continue;
  }
  const loja = lojaDoProduto(p);
  if (!loja) {
    prodSemLoja++;
    continue;
  }
  prodRows.push({
    bubble_id: p._id,
    loja_id: loja,
    nome: p.NomeDoProduto ?? "(sem nome)",
    descricao: p.DescricaoDoProduto ?? null,
    valor: num(p.PrecoProduto) ?? num(p.ValorProduto) ?? 0,
    sku: p.Referencia_SKU ?? null,
    quantidade_minima: num(p.Quantidade_Minima),
    estoque_atual: num(p.Estoque_Atual) ?? 0,
    cep_produto: p.ceptext ?? p.ProdutoCEP ?? null,
    categoria_id: catMap[p.CategoriaProduto] ?? null,
    subcategoria_id: subMap[p.SubCategoria] ?? null,
    permite_afiliacao: p.permiteAfiliacao === true,
    porcentagem_afiliado: num(p["%afiliado"]) ?? 5,
    altura: num(p.AlturaProduto),
    comprimento: num(p.Comprimento_do_Produto),
    largura: num(p.LarguraDoProduto),
    peso: num(p.PesoDoProduto),
    status_produto: p.StatusProduto ?? "Pendente",
    created_at: p["Created Date"],
  });
}
console.log(`produtos: ${prodSemLoja} sem loja, ${prodExcluidos} excluídos — fora`);
const prodMap = await upsert("produtos", prodRows);

// imagens (lista ImgProduto) e centros do produto (Cds_disponiveis)
const imgRows = [];
const pcRows = [];
for (const p of prodsRaw) {
  const pid = prodMap[p._id];
  if (!pid) continue;
  (Array.isArray(p.ImgProduto) ? p.ImgProduto : p.ImgProduto ? [p.ImgProduto] : []).forEach(
    (url, i) => imgRows.push({ produto_id: pid, url, ordem: i }),
  );
  (p.Cds_disponiveis ?? []).forEach((cd) => {
    if (centroMap[cd]) pcRows.push({ produto_id: pid, centro_id: centroMap[cd] });
  });
}
// Bubble repete a mesma URL na lista de alguns produtos: dedup no lote
const dedup = (rows, key) => [...new Map(rows.map((r) => [key(r), r])).values()];
await upsert("produto_imagens", dedup(imgRows, (r) => r.produto_id + r.url), "produto_id,url");
await upsert("produto_centros", dedup(pcRows, (r) => r.produto_id + r.centro_id), "produto_id,centro_id");

// pedidos — loja via vendedores[0] (User) → loja do dono, ou via itens
const itensRaw = load("item_para_compra");
const lojaByBubbleUser = {}; // dono bubble -> loja uuid
for (const l of lojasRaw) if (lojaMap[l._id]) lojaByBubbleUser[l._Dono_Proprietario] = lojaMap[l._id];
const itemById = Object.fromEntries(itensRaw.map((i) => [i._id, i]));

const pedidosRaw = load("PedidosVendedor");
const pedRows = [];
const idVendaVistos = new Set();
let pedSemLoja = 0;
for (const pe of pedidosRaw) {
  const vend = (pe.vendedores ?? [])[0];
  let loja = lojaMap[vend] ?? lojaByBubbleUser[vend];
  if (!loja) {
    // fallback: loja do primeiro item
    const it = (pe.itens ?? []).map((id) => itemById[id]).find((i) => i?.Loja && lojaMap[i.Loja]);
    loja = it ? lojaMap[it.Loja] : null;
  }
  if (!loja) {
    pedSemLoja++;
    continue;
  }
  // id_cobranca repetido no dump (ex.: pay_qbd9fby2ch2u8ewz) → sufixo do _id
  let idVenda = pe.id_cobranca ?? pe._id;
  if (idVendaVistos.has(idVenda)) idVenda = `${idVenda}-${pe._id.slice(-6)}`;
  idVendaVistos.add(idVenda);
  pedRows.push({
    bubble_id: pe._id,
    id_venda: idVenda,
    loja_id: loja,
    cliente_id: userMap[pe["Created By"]] ?? null,
    data: pe["Created Date"],
    status_pedido: pe.Status ?? "Aguardando Pagamento",
    valor_pedido: num(pe.Total) ?? 0,
    asaas_cobranca_id: pe["ID Cobrança_asaas"] ?? null,
    link_cobranca: pe.LinkCobranca ?? null,
    forma_pagamento: pe.forma_pagamento ?? pe.billingType ?? null,
    dt_pagamento: pe["Dt.Pagamento"] ?? null,
    repasse_ind24: num(pe.repasse_ind24),
    valor_recebido_industria: pe.valor_recebido_pelo_industria ?? null,
    created_at: pe["Created Date"],
  });
}
console.log(`pedidos: ${pedSemLoja} sem loja — fora`);
const pedMap = await upsert("pedidos", pedRows);

// linha_itens — só itens referenciados por pedido (órfãos fora, decisão D-mig2)
const itemRows = [];
let orfaos = 0;
const pedidoByItem = {};
for (const pe of pedidosRaw) for (const iid of pe.itens ?? []) pedidoByItem[iid] = pedMap[pe._id];
for (const it of itensRaw) {
  const pid = pedidoByItem[it._id];
  if (!pid) {
    orfaos++;
    continue;
  }
  itemRows.push({
    bubble_id: it._id,
    pedido_id: pid,
    produto_id: prodMap[it.Produto] ?? null,
    quantidade: num(it.Qntd) ?? 1,
    valor: num(it.Valortotal) ?? 0,
    repasse_ind: num(it.repasse_ind24) ?? 0,
    repasse_afiliado: num(it.repasse_afiliado) ?? 0,
    repasse_vendedor: num(it.repasse_vendedor),
    transferido: it["Lojista ja recebeu"] === true,
    entregue: it.Entregue === true,
    pago: it.PAGO === true,
    cod_entrega: it.cod_entrega ?? null,
    data_entrega: it.data_entrega ?? null,
    dt_pagamento_cliente: it.dt_pagamento_pelo_cliente ?? null,
    valor_frete: num(it.ValorFrete),
    retirar_na_loja: it.retirar_na_loja === true,
    entrega_cep: it.EntregaCep ?? null,
    entrega_rua: it.rua_entrega ?? null,
    entrega_bairro: it.Entregabairro ?? null,
    entrega_numero: it.entregaNUM ?? it.numCasaEntrega ?? null,
    entrega_cidade: it.cidadeEntrega ?? null,
    entrega_complemento: it.complemento ?? null,
    centro_id: centroMap[it.Cd_selecionado] ?? null,
    afiliado_id: userMap[it["afiliado "]] ?? null, // sim, a chave Bubble tem espaço
  });
}
console.log(`linha_itens: ${orfaos} órfãos (carrinho abandonado) — fora`);
await upsert("linha_itens", itemRows);

// afiliações — carregam loja E produto (dump real tem os dois)
await upsert(
  "afiliacoes",
  load("Relacao_Afiliado_Loja")
    .filter((r) => lojaMap[r.Loja] || prodMap[r.Produto])
    .map((r) => ({
      bubble_id: r._id,
      loja_id: lojaMap[r.Loja] ?? null,
      produto_id: prodMap[r.Produto] ?? null,
      afiliado_id: userMap[r.usersAfiliado] ?? null,
      identificador: r.CodigoDeAfiliacao ?? null,
      porcentagem: num(r.Porcentagem) ?? 0,
      status: ["Pendente", "Aprovada", "Suspensa"].includes(r.StatusAfiliacao)
        ? r.StatusAfiliacao
        : "Pendente",
      created_at: r["Created Date"],
    })),
);

// vendas futuras
await upsert(
  "vendas_futuras",
  load("venda_futura")
    .filter((v) => prodMap[v.produto])
    .map((v) => ({
      bubble_id: v._id,
      produto_id: prodMap[v.produto],
      previsao: v.disponibilidade ? v.disponibilidade.slice(0, 10) : null,
      estoque: num(v.estoque),
      created_at: v["Created Date"],
    })),
);

// promoções progressivas — faixa única real do Bubble: a partir de N, unidade fica R$X
await upsert(
  "promocoes_progressivas",
  load("Promocaoprogressiva")
    .filter((p) => prodMap[p.Produto])
    .map((p) => ({
      bubble_id: p._id,
      produto_id: prodMap[p.Produto],
      faixas: [{ min_qtd: num(p.Apartirde) ?? 0, valor_unitario: num(p.oprodutofica) }],
      ativo: true,
      created_at: p["Created Date"],
    })),
);

console.log("Importação concluída.");
