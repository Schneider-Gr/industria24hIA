---
name: afiliado-logistica
description: Processo completo do afiliado logístico do Industria24h (industria24.com.br) — como o parceiro se afilia, como o seller habilita produtos por flag, como o checkout despacha a corrida via webhook Asaas, e como o afiliado vê distância/percurso do endereço do comprador. Use SEMPRE antes de tocar em despacho de corrida, afiliação de logística, o flag permite_logistica_afiliado, ou ao responder como o afiliado logístico funciona.
---

# Afiliado Logístico — Industria24h

Quem entrega os pedidos da loja. Dois papéis distintos, não confundir:

- **Afiliado logístico DA LOJA** — pessoa/empresa afiliada a uma loja específica
  (`afiliacoes.tipo = 'logistica'`), aprovada pelo seller. Ganha **exclusividade
  de 5 min** sobre cada corrida daquela loja antes de ela cair no pool.
- **Parceiro de plataforma** (motorista/transportadora) — cadastro global
  moderado por admin (`parceiros_logisticos`), atende o **pool** de corridas que
  nenhum afiliado exclusivo pegou.

É **caminho do dinheiro** (mexe em frete e repasse): toda mudança na RPC de
despacho testa em `begin; … select <verificação>; rollback;` no banco linkado
antes de aplicar. Complementa `regras-de-negocio` (repasse 5%, frete) e
`despacho-automatico` — leia junto.

Migration canônica do módulo por-produto + percurso: **0079**. Estado em prod
desde 24/07/2026 (PR #97).

## Fluxo ponta a ponta

```
parceiro solicita → seller aprova → comprador paga → webhook despacha →
  corrida com endereço do comprador + percurso → afiliado aceita → entrega
```

### 1. Parceiro se afilia
- **Afiliado da loja:** `/afiliado/solicitar` → seção "Afiliar-se a uma loja"
  (`SecaoAfiliarLoja`), select `tipo = Logística/entregas` →
  `solicitarAfiliacaoLoja` em `src/app/(afiliado)/afiliado/actions.ts`. Cria
  linha em `afiliacoes` com `status = 'Pendente'`.
- **Parceiro de plataforma:** `/parceiro/cadastro` → `parceiros_logisticos`.
- **Entrada pública** (0079): coluna "Para quem entrega" no `VitrineFooter`
  (`src/components/vitrine/ui.tsx`) + landing `/seja-parceiro`
  (`src/app/seja-parceiro/page.tsx`). Antes disso só chegava quem sabia a URL.

### 2. Seller aprova e habilita produtos
- **Aprova a afiliação:** `/seller/afiliados` → muda `afiliacoes.status` para
  `'Aprovada'`. Parcerias de representante de plataforma: `/seller/parceiro-logistica`.
- **Habilita por produto** (0079, era o buraco principal): flag
  `produtos.permite_logistica_afiliado boolean not null default true`. Checkbox
  "Afiliado logístico da loja pode entregar este produto" no `ProdutoForm` e no
  grid inline (`ProdutoLinha`). Gravado nas duas actions
  (`src/app/(seller)/seller/produtos/actions.ts`) via
  `formData.get("permite_logistica_afiliado") === "on"`.
- **Default TRUE de propósito:** hoje o afiliado atende a loja inteira; um
  default `false` desligaria a exclusividade de todos os pedidos vivos de uma vez.
  O seller **desmarca** o que não quer que o afiliado leve.

### 3. Checkout despacha a corrida
O webhook do Asaas confirma o pagamento e chama a RPC:
`src/app/api/asaas/webhook/route.ts` → `despachar_corrida_automatica(pedido_id)`.

Regras da RPC (versão **0074**, ajustada pela 0079):
- Idempotente por `corridas.pedido_id` (retorna a corrida existente).
- `pedidos.frete_consolidado = true` → retorna `null` (espera o lote do admin).
- Lê o endereço de entrega **do comprador** em `linha_itens.entrega_*` (cep,
  rua, numero, bairro, cidade, complemento). Sem linha de entrega
  (`retirar_na_loja = true` em tudo) → `null`, sem corrida.
- `preco_final = preco_sugerido = sum(valor_frete)` de todas as linhas de entrega.
- Janela do parceiro: `now()` a `now() + interval '4 hours'` (0048).
- **Exclusividade do afiliado (0079):** só elege o afiliado logístico Aprovado
  da loja se **nenhum** item com entrega do pedido estiver desabilitado
  (`not exists ... where pr.permite_logistica_afiliado = false`). Se um item
  desmarcado entrar no pedido, `afiliado_exclusivo_id = null` e a corrida nasce
  direto no pool. Exclusividade dura 5 min (`exclusividade_fim`).

### 4. Percurso gravado na corrida
Colunas 0079 em `corridas`: `distancia_m int`, `duracao_s int`, `link_mapa text`
(a tabela `corridas` é 0039; a `rotas` do fluxo manual antigo já tinha distância,
`corridas` não). O webhook, **antes** do early-return de exclusividade, chama
`calcularTrajeto(origem, destino)` (`src/lib/maps.ts`, Google Distance Matrix) e
grava km/duração/link na corrida. `GOOGLE_MAPS_API_KEY` **já está registrada na
Vercel (Production)** — o percurso sai em km. Sem a chave, `calcularTrajeto`
devolve `null` e grava só o `link_mapa` (`linkTrajeto`), sem mock.

### 5. Afiliado atende
- `/afiliado/logistica` — seção "Corridas automáticas": aceitar → Coletada →
  EmTransito → Entregue. Mostra `X,X km · ~Y min` + "Ver rota no mapa".
- `/corridas/[id]` — detalhe da corrida (usa `select("*")`, colunas novas vêm
  automáticas), mesma linha de percurso + timeline + lances (modo leilão).

## Gotchas

- **Recriar a RPC PARTINDO DA VERSÃO ATUAL, não da original.**
  `despachar_corrida_automatica` foi redefinida em 0043 → 0048 → 0074 → 0079.
  Começar do corpo antigo perde `janela_inicio/janela_fim` (NOT NULL, erro 23502),
  o skip de `frete_consolidado` e o `frete = soma`. Rodar sempre
  `git grep -l "function.*despachar"` antes de recriar.
- **`db push` quebra por drift neste projeto** — aplicar migration via
  `supabase db query --linked --file`. "Aplicada" só é fato após `db query`
  confirmar o objeto no schema real.
- **`gen types` sem token TRUNCA `database.types.ts`** — as colunas novas de
  `produtos`/`corridas` foram adicionadas à mão nos tipos. Tabelas 0039
  (`corridas`, `corrida_*`) ficam fora dos tipos gerados; telas usam
  `supabase as any` com o eslint-disable.
- **E2E:** `supabase/tests/e2e_logistica_afiliado.sql` (begin/rollback):
  habilitado → exclusividade preenchida; item desabilitado → pool
  (`afiliado_exclusivo_id null`); retirada → sem corrida; idempotência. Seed
  precisa de `lojas.permite_retirada_na_loja = true` e loja `situacao = 'Ativa'`.
