---
prd_number: "025"
status: rascunho
priority: média
created: 2026-08-20
issue: ""
depends_on: ["023"]
references:
  - "src/lib/repasses.ts"
  - "supabase/migrations/0083_comissao_plataforma_corrida.sql"
  - "supabase/migrations/0111_repasse_automatico_confirmacao_entrega.sql"
  - "supabase/migrations/0129_repasse_automatico_afiliado.sql"
  - "supabase/migrations/0079_logistica_afiliado_produto.sql"
  - "supabase/migrations/0039_parceiro_logistico_schema.sql"
  - "docs/prds/023-sistema-repasse-asaas.md"
  - "docs/prds/022-painel-corridas-parceiro-campo.md"
  - ".claude/skills/afiliado-logistica/SKILL.md"
---

# PRD 025: Repasse Automático ao Afiliado/Parceiro Logístico

## 1. Contexto

- **Produto/área**: Indústria 24h, marketplace de Manaus. Módulo de logística
  (`afiliado-logistica` + `/parceiro`) — quem entrega os pedidos e as corridas
  avulsas do marketplace.
- **Estado atual**: o valor líquido que o afiliado logístico da loja ou o
  parceiro de plataforma deveria receber por uma corrida já é **calculado**
  automaticamente — `corridas.valor_parceiro` é coluna gerada
  (`preco_final * (1 - comissao_pct / 100)`, comissão padrão de 10%, migration
  0083). O que não existe é o **pagamento** desse valor. O repasse automático
  via PIX já funciona para seller (migration 0111) e para afiliado de vendas
  (migration 0129), mas a tabela `repasses` só aceita `destino in ('seller',
  'afiliado')` — não há linha para "quem fez a entrega". Não existe sequer
  coluna de chave PIX em `parceiros_logisticos` nem em `afiliacoes` para o
  tipo `logistica`; hoje o pagamento ao entregador acontece 100% fora do
  sistema.
- **Problema**: o app mostra ao parceiro/afiliado logístico, em `/parceiro` e
  `/corridas/[id]`, quanto ele "ganha" por corrida (`valor_parceiro`,
  decisão de produto do PRD 022 — "o valor exibido ao parceiro é sempre o
  líquido dele"), criando uma expectativa de recebimento que o sistema não
  cumpre sozinho. Cada corrida entregue gera trabalho manual de conferência e
  pagamento para o admin, sem rastro no ledger de `repasses` nem visibilidade
  para o parceiro de que foi pago. É o mesmo gap que motivou o repasse
  automático de seller (0111) e afiliado (0129), só que ainda não fechado
  para logística.

> **Contexto técnico**: o mecanismo de transferência (PIX via API Asaas
> `POST /v3/transfers`, chamado por `src/lib/repasses.ts`) já existe e não
> muda — este PRD estende o *destino* do repasse, não troca o transporte do
> dinheiro. Split nativo do Asaas (`walletId`) segue descartado, mesma
> decisão registrada nas migrations 0111/0129.

## 2. Solução Proposta

### Visão de produto

- Fechar o ciclo financeiro da logística: toda corrida `Entregue` com
  afiliado exclusivo ou parceiro atribuído gera uma linha em `repasses` com
  `destino = 'parceiro_logistico'` e `valor = corridas.valor_parceiro`,
  paga via PIX pelo mesmo pipeline que já paga seller e afiliado de vendas.
- Dar ao afiliado/parceiro o mesmo tipo de rastreabilidade que o seller já
  tem — a corrida some da lista "a receber" quando o repasse é confirmado,
  com status visível (`pendente` / `transferido` / `falhou` / `inelegível`).
- Reaproveitar a UI de cadastro de chave PIX já existente
  (`ChavePixForm`, usada por seller e afiliado de vendas) para
  `parceiros_logisticos` e para a afiliação `tipo = 'logistica'`.

### Decisões de produto

1. **Gatilho é a confirmação de entrega da corrida, não do pedido.**
   Corridas avulsas (`/corridas/nova`) não têm `pedido_id` — não dá para
   depender de `pedido_confirmar_entrega` (0111) como gatilho único. O
   disparo correto é a transição de `corridas.status` para `'Entregue'`
   (`atualizar_status_corrida`), cobrindo corrida ligada a pedido e corrida
   avulsa com o mesmo código. *(premissa — confirme ou corrija: hoje só
   corrida ligada a pedido do marketplace paga; corrida avulsa entre dois
   terceiros pode ter regra de cobrança do embarcador ainda em aberto —
   ver PRD mobilidade-urbana-on-demand, seção "Pagamento do frete")*
2. **Novo destino `'parceiro_logistico'` em `repasses`, não reaproveitar
   `'afiliado'`.** Misturar os dois destinos no mesmo valor quebraria a
   distinção que a UI de admin (`/admin/repasses`) já faz entre comissão de
   venda e comissão de entrega — são fluxos de negócio diferentes com a
   mesma mecânica de transporte.
3. **Chave PIX por parceiro/afiliado logístico é campo novo, não
   reaproveita `afiliado_dados_pix`.** Um afiliado de vendas e um afiliado
   logístico da mesma loja podem ser pessoas diferentes com contas
   diferentes; a tabela precisa distinguir por `afiliacao_id` (tipo
   `logistica`) ou por `parceiro_logistico_id`, não por `user_id` genérico.
   *(premissa — confirme ou corrija: se a mesma pessoa acumula os dois
   papéis, pode preferir a mesma chave para ambos — decisão de produto em
   aberto)*
4. **Comissão de 10% (migration 0083) não muda neste PRD.** Este PRD só
   automatiza o pagamento do valor já calculado; qualquer revisão do
   percentual ou de regra por categoria/urgência é decisão de negócio
   separada, fora deste escopo.
5. **Falha de repasse não desfaz a confirmação de entrega**, mesma regra já
   aplicada a seller/afiliado (comentário em `src/lib/repasses.ts`): melhor
   esforço, marca `'falhou'` no ledger, admin resolve manualmente.

### Fora do escopo

- **Split nativo do Asaas (`walletId`)** — decisão já descartada em 10/07,
  mantida aqui.
- **Revisão do percentual de comissão da plataforma (10%)** — regra de
  negócio separada, não travada por este PRD.
- **Cobrança do frete de corrida avulsa não ligada a pedido** — quem paga o
  motorista numa corrida entre dois terceiros sem pedido do marketplace por
  trás é gap do PRD `mobilidade-urbana-on-demand` (ainda DRAFT); este PRD só
  garante que, uma vez que exista dinheiro do frete em posse da plataforma,
  ele seja repassado automaticamente.
- **Antecipação de recebíveis, IR/retenção fiscal** — mesmo fora de escopo
  já declarado no PRD 023.
- **Notificação (e-mail/WhatsApp) ao parceiro sobre repasse recebido** —
  pode ser incremento futuro; não é bloqueio para o ledger funcionar.

## 3. Funcionalidades

### US01: Parceiro/afiliado logístico cadastra chave PIX de recebimento

Como afiliado logístico da loja ou parceiro de plataforma, quero cadastrar
minha chave PIX, para que a plataforma saiba para onde transferir o valor
das corridas que entrego.

**Rules:**
- Campo `chave_pix` + `tipo_chave_pix` (mesmo enum `CPF|CNPJ|EMAIL|PHONE` já
  usado por `lojas` e `afiliado_dados_pix`) associado a `parceiros_logisticos`
  e à afiliação de tipo `logistica`.
- Reaproveita o componente `ChavePixForm` já existente, sem criar UI nova do
  zero.
- Sem chave cadastrada, o repasse correspondente nasce/permanece com status
  `'inelegível'`, mesmo comportamento hoje aplicado a seller e afiliado de
  vendas sem chave.

**Edge cases:**
- Parceiro tem cadastro em `parceiros_logisticos` E é afiliado logístico de
  uma loja ao mesmo tempo → cada vínculo mantém sua própria chave; nenhuma
  regra deste PRD funde os dois. *(premissa — confirme ou corrija)*

### US02: Repasse automático ao concluir a entrega da corrida

Como afiliado/parceiro logístico, quero receber automaticamente o valor
líquido da corrida assim que confirmo a entrega, para não depender de
conferência manual do admin.

**Rules:**
- Ao `atualizar_status_corrida` transicionar para `'Entregue'`, o app chama
  a extensão de `dispararRepasseAutomatico` (ou uma função irmã dedicada),
  que insere/atualiza uma linha em `repasses` com
  `destino = 'parceiro_logistico'`, `valor = corridas.valor_parceiro`.
- Reaproveita o mesmo `transferirRepasse` de `src/lib/repasses.ts` — elegibilidade
  por chave PIX cadastrada, transferência via `createPixTransfer`, status
  final `'transferido'`/`'falhou'`/`'inelegível'`.
- Idempotente por `(corrida_id)` — reprocessar a mesma corrida não duplica
  transferência.

**Edge cases:**
- Corrida cancelada após `Entregue` (não deveria acontecer pela máquina de
  estados atual, mas se acontecer) → repasse já `'transferido'` não é
  estornado automaticamente; segue o mesmo caminho manual do estorno de
  pedido (RPC `admin_estornar_pedido`, PRD já existente). *(premissa —
  confirme ou corrija)*
- Corrida com `afiliado_exclusivo_id` E `parceiro_id` preenchidos ao mesmo
  tempo (não deveria ocorrer pela regra de `aceitar_corrida`, que zera um ou
  outro) → repassa para quem efetivamente está em `parceiro_id`/`afiliado_
  exclusivo_id` no momento da entrega, nunca os dois.

### US03: Admin acompanha repasses de logística no mesmo painel

Como admin, quero ver os repasses de comissão de entrega junto com os de
venda em `/admin/repasses`, para ter uma visão financeira única do
marketplace.

**Rules:**
- `/admin/repasses` passa a listar também linhas `destino =
  'parceiro_logistico'`, com o mesmo conjunto de ações já existente
  (reprocessar, marcar inelegível, ver motivo de falha).
- Filtro por destino (seller / afiliado / parceiro logístico) para não
  misturar os três fluxos visualmente.

**Edge cases:**
- Nenhum edge case novo além dos já cobertos pela tela atual de
  `/admin/repasses` (PRD 023).

## 4. Fluxo de Negócio

```
corrida Entregue
  → recalcula valor_parceiro (já é coluna gerada, sem ação extra)
  → dispara repasse (destino=parceiro_logistico, valor=valor_parceiro)
  → tem chave PIX cadastrada?
      não → repasses.status = 'inelegível' (admin resolve manualmente)
      sim → chama Asaas POST /v3/transfers
              sucesso → repasses.status = 'transferido'
              falha   → repasses.status = 'falhou' (Sentry + admin resolve)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|-------------------|------------------------------|
| Afiliado/parceiro logístico cadastra chave PIX pela mesma UI já usada por seller/afiliado | reaproveita padrão já validado, sem UI nova | cadastrar chave em `/afiliado/logistica` ou `/parceiro` e conferir gravação no banco |
| Corrida `Entregue` com chave cadastrada gera repasse `'transferido'` sem ação do admin | é o objetivo central do PRD | `begin; ...; select status from repasses where destino='parceiro_logistico'; rollback;` após simular entrega |
| Corrida `Entregue` sem chave cadastrada gera repasse `'inelegível'`, sem exceção não tratada | evita corrida travada por erro de transferência | mesmo teste, sem chave cadastrada |
| `/admin/repasses` lista e filtra repasses de logística | dá visibilidade financeira ao admin | inspeção visual da tela após seed de dados |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|------------------|-------------|
| % de repasses de logística pagos automaticamente (sem intervenção manual) | 0% hoje (100% manual, confirmado nesta sessão) | ≥ 80% das corridas entregues com chave PIX cadastrada | 60 dias após deploy | não regressão em relação ao processo manual atual | dono do módulo `logistica-parceiro` |
| Corridas `Entregue` sem linha correspondente em `repasses` | não medido hoje | 0 | Contínuo | 0 | dono do módulo |

## 6. Milestones

### Milestone 1: Cadastro de chave PIX para logística

**Por que é um marco:** pré-requisito técnico — sem chave, o repasse
automático nasce sempre `'inelegível'`.

**Funcionalidades:** US01

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Coluna(s) de chave PIX em `parceiros_logisticos` e na afiliação tipo `logistica`
- [ ] `ChavePixForm` reaproveitado nas telas `/parceiro` e `/afiliado/logistica`

**Aprovador:** dono do repositório (industria24hs-creator)

### Milestone 2: Repasse automático na entrega da corrida

**Por que é um marco:** fecha o ciclo financeiro — é o valor central do PRD.

**Funcionalidades:** US02, US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] `atualizar_status_corrida` para `'Entregue'` dispara o repasse
- [ ] `/admin/repasses` mostra e filtra repasses de logística
- [ ] Teste e2e (`begin; ...; rollback;`) cobrindo elegível/inelegível/idempotência, no padrão de `supabase/tests/e2e_logistica_afiliado.sql`

**Aprovador:** dono do repositório (industria24hs-creator)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Corrida avulsa sem pedido por trás não tem dinheiro em posse da plataforma para repassar | Alto | escopo deste PRD cobre só o repasse do valor já custodiado; cobrança do embarcador é gap separado (mobilidade-urbana-on-demand) | Monitorando |
| Reaproveitar `transferirRepasse` genérico o suficiente para um terceiro destino sem duplicar lógica | Médio | validar em PR se a assinatura atual (`opts.rpcElegivel`, `opts.tabelaChave`) já cobre o caso ou precisa de pequeno ajuste | A validar na implementação |
| Mesma pessoa acumula afiliado de vendas + afiliado logístico com chaves PIX divergentes | Baixo | US01 mantém os vínculos separados por desenho; sem decisão de fusão | Mitigado por desenho |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|------------------------|
| PRD 023 (Sistema de Repasse Automático via Asaas) | Interna | mecanismo de transferência PIX já implementado (0111/0129) | nenhum — este PRD só estende o destino |
| Definição de regra de cobrança para corrida avulsa sem pedido | Externa (decisão de produto) | Pendente | Milestone 2 cobre só corridas com dinheiro já custodiado (ligadas a pedido); corrida avulsa pura fica sem repasse automático até essa regra existir |

## 8. Referências

- `src/lib/repasses.ts` — pipeline de transferência PIX já existente (seller, afiliado)
- `supabase/migrations/0083_comissao_plataforma_corrida.sql` — cálculo de `valor_parceiro` (10% de comissão)
- `supabase/migrations/0111_repasse_automatico_confirmacao_entrega.sql` — repasse automático ao seller, comentário explícito sobre repasse logístico pendente
- `supabase/migrations/0129_repasse_automatico_afiliado.sql` — repasse automático ao afiliado de vendas
- `docs/prds/023-sistema-repasse-asaas.md` — PRD do mecanismo de repasse que este PRD estende
- `docs/prds/022-painel-corridas-parceiro-campo.md` — decisão de produto de exibir `valor_parceiro` líquido ao parceiro
- `.claude/skills/afiliado-logistica/SKILL.md` — fluxo ponta a ponta do afiliado logístico

## 9. Registro de Decisões

- **2026-08-20:** PRD criado para formalizar um gap identificado em sessão de
  levantamento (não em brainstorm com o dono do produto) — a comissão de
  logística já é calculada (`valor_parceiro`, migration 0083) mas nunca foi
  automatizado o pagamento dela, ao contrário do que já existe para seller
  (0111) e afiliado de vendas (0129). Necessário validar com o dono do
  produto antes de sair de `rascunho`.
