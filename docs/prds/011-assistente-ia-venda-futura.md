---
prd_number: "011"
status: rascunho
priority: média
created: 2026-08-10
issue: "#259"
depends_on: []
references:
  - "src/app/(seller)/seller/venda-futura/ia-actions.ts"
  - "src/components/seller/VendaFuturaForm.tsx"
  - "src/app/(seller)/seller/produtos/ia-actions.ts"
---

# PRD 011: Assistente de IA para cadastro de Venda Futura

## 1. Contexto

- **Produto/área**: Painel do seller, módulo Venda Futura (`/seller/venda-futura`).
- **Estado atual**: o seller cadastra manualmente cada venda futura (produto, estoque,
  valor unitário e data de disponibilidade) num formulário simples. Sem histórico
  visível no formulário, sem apoio para estimar quantidade/preço/data — o seller decide
  tudo de memória, mesmo tendo cadastros anteriores do mesmo produto no próprio sistema.
- **Problema**: cadastrar venda futura de cabeça é lento e sujeito a erro, especialmente
  para produtos com sazonalidade real (ex.: safra agrícola) em que a data de
  disponibilidade não é óbvia. *(premissa — confirme ou corrija: a dor primária é
  velocidade/comodidade de preenchimento, não falta de capacidade de cadastrar)*

> **Contexto técnico** (stack, arquitetura, padrões) vive no TRD, carregado
> automaticamente na implementação. Aqui só um ponteiro: a feature reusa o padrão de
> assistente de IA já existente em `seller/produtos/ia-actions.ts` (Anthropic Claude via
> server action, JSON Schema, sem gravação automática) e não introduz infraestrutura nova.

## 2. Solução Proposta

### Visão de produto

- Botão "IA: sugerir estoque, valor e data" no formulário de nova venda futura, ao lado
  do produto selecionado.
- A IA consulta o histórico de vendas futuras já cadastradas para aquele produto
  específico e pré-preenche os três campos (estoque, valor, previsão de disponibilidade).
- A sugestão nunca é gravada sozinha — só preenche os campos do form; o seller revisa e
  decide clicar em "Registrar venda futura".
- A sugestão vem acompanhada de uma justificativa curta e de um rótulo do motivo
  (sazonalidade conhecida / baseado em histórico / estimativa conservadora), para o
  seller calibrar o quanto confiar na sugestão antes de aceitar.

### Decisões de produto

1. **A IA nunca inventa sazonalidade para produto que não tem uma real.** Só produto
   agrícola/de safra recebe justificativa de "sazonalidade conhecida"; produto industrial
   de reposição contínua (cimento, vergalhão, tijolo etc.) é tratado como não-sazonal por
   padrão. Motivo: teste manual mostrou a IA produzindo uma narrativa de "ciclo de
   produção" plausível, mas fabricada, para um produto sem sazonalidade real — isso mina a
   confiança do seller na ferramenta.
2. **Quando não há sazonalidade real, a data é calculada a partir do intervalo médio real
   entre os cadastros anteriores do produto — calculado deterministicamente, não estimado
   pela IA.** Garante que a sugestão é rastreável a um dado real, não a uma "impressão" do
   modelo.
3. **Sem histórico suficiente (menos de 2 cadastros anteriores), a sugestão vira uma
   estimativa conservadora simples (janela de ~30 dias), com a justificativa dizendo
   explicitamente que não há base histórica.** Evita a IA preencher a lacuna com um motivo
   de negócio inventado.
4. **A sugestão é sempre editável e nunca grava sozinha.** Mesmo padrão de segurança do
   assistente de curadoria de produto já existente — a IA nunca é a última palavra sobre
   dado que vai para o catálogo/estoque.

### Fora do escopo

- Previsão de demanda baseada em vendas do marketplace inteiro (só usa o histórico do
  próprio produto/loja) — ver PRD futuro se houver necessidade de forecasting agregado.
- Geração automática de venda futura sem revisão do seller (auto-cadastro).
- Alertas proativos ("seu produto X provavelmente entra em safra em Y dias") — a feature
  atual é reativa, disparada pelo clique do seller. *(premissa — confirme ou corrija)*
- Edição de venda futura já cadastrada via IA — a sugestão só se aplica ao formulário de
  criação.

## 3. Funcionalidades

### US01: Sugestão de estoque, valor e data por produto

Como seller, quero que a IA sugira estoque, valor e data de disponibilidade a partir do
histórico do produto que estou cadastrando, para não precisar estimar esses valores do
zero a cada venda futura.

**Rules:**
- O botão só aparece quando a loja tem ao menos um produto cadastrado (mesma condição do
  formulário hoje).
- A sugestão usa como contexto: nome e preço normal do produto, e até 8 vendas futuras
  anteriores do mesmo produto (previsão, estoque, valor), ordenadas da mais recente para
  a mais antiga.
- Os três campos do formulário (estoque, valor, previsão) são preenchidos automaticamente
  com o resultado — sem submeter o formulário.
- A justificativa e o motivo da sugestão são exibidos junto aos campos preenchidos.
- Data sugerida nunca é anterior à data atual.

**Edge cases:**
- `ANTHROPIC_API_KEY` não configurada → botão retorna erro claro ("IA não configurada"),
  sem preencher nada.
- Produto não pertence à loja do usuário logado → sugestão recusada ("Produto não
  encontrado"), mesma checagem de dono usada no cadastro de produto.
- Sessão expirada no momento do clique → retorna erro "Sessão expirada", sem preencher.
- IA retorna uma data no passado → sugestão é descartada e o seller vê erro pedindo para
  tentar de novo, em vez de um campo com data inválida.
- IA retorna JSON fora do schema esperado → erro genérico de falha, campos do formulário
  não são tocados.

### US02: Motivo declarado da sugestão (sazonalidade vs. histórico vs. estimativa)

Como seller, quero saber se a sugestão da IA se baseia em sazonalidade real, no histórico
do meu próprio produto, ou é só uma estimativa conservadora, para calibrar o quanto devo
confiar nela antes de registrar.

**Rules:**
- Todo resultado de sugestão inclui um campo `motivo` com um de três valores:
  `sazonalidade_conhecida`, `intervalo_historico` ou `sem_base_conservador`.
- `sazonalidade_conhecida` só pode ser escolhido para produto com sazonalidade real
  conhecida (ex.: agrícola/safra) — nunca para produto industrial de reposição contínua.
- `intervalo_historico` exige que a data sugerida seja calculada a partir do intervalo
  médio real (em dias) entre os cadastros anteriores do produto, calculado de forma
  determinística no backend, não estimado pela IA.
- `sem_base_conservador` é usado quando não há sazonalidade conhecida nem histórico
  suficiente (menos de 2 cadastros); a justificativa deixa explícito que a estimativa é
  conservadora e sem base histórica.
- A justificativa em texto livre precisa ser consistente com o motivo escolhido — nunca
  descrever um ciclo de produção, demanda ou sazonalidade que não foi informado como fato
  real no contexto enviado à IA.
- O motivo é exibido na UI como um rótulo curto ao lado da justificativa (ex.: "Baseado no
  histórico").

**Edge cases:**
- Produto tem exatamente 1 cadastro anterior → intervalo médio não é calculável (exige
  2+ pontos) → motivo cai em `sem_base_conservador`, não em `intervalo_historico`.
- Produto sem nenhum histórico e sem sazonalidade conhecida → motivo
  `sem_base_conservador` com janela padrão de ~30 dias.
- IA escolhe `sazonalidade_conhecida` para produto industrial → tratado como falha de
  qualidade da sugestão a ser monitorada; não há guarda automática além do system prompt
  hoje *(premissa — confirme ou corrija: se recorrente, pode virar validação
  determinística adicional, como no assistente de preço de compra coletiva)*.

## 4. Fluxo de Negócio

```
Seller seleciona produto no form de venda futura
   │
   ▼
Clica "IA: sugerir estoque, valor e data"
   │
   ▼
Produto tem 2+ vendas futuras anteriores?
   ├── sim, com sazonalidade agrícola conhecida ──▶ motivo = sazonalidade_conhecida
   ├── sim, sem sazonalidade conhecida ──▶ calcula intervalo médio real ──▶ motivo = intervalo_historico
   └── não (0 ou 1 cadastro anterior) ──▶ estimativa conservadora (~30 dias) ──▶ motivo = sem_base_conservador
   │
   ▼
Campos (estoque, valor, previsão) preenchidos + justificativa exibida
   │
   ▼
Seller revisa e edita se necessário
   │
   ▼
Seller clica "Registrar venda futura"? ──┬── sim ──▶ grava em vendas_futuras
                                          └── não ──▶ nada é gravado
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Sugestão nunca grava dado sem ação explícita do seller | dado errado direto no estoque/preço afeta venda real | Clicar no botão de IA e confirmar que nenhum registro novo aparece na tabela de vendas futuras até o seller clicar em "Registrar" |
| Produto sem sazonalidade real nunca recebe motivo `sazonalidade_conhecida` | perda de confiança do seller na ferramenta se a IA "inventar" uma safra que não existe | Testar com produto industrial (ex.: vergalhão, cimento) e conferir que o motivo retornado é `intervalo_historico` ou `sem_base_conservador` |
| Data sugerida é sempre >= data atual | data no passado é operacionalmente inútil para pré-venda | Testar em produto sem histórico e conferir que a previsão sugerida nunca é anterior a hoje |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| % de vendas futuras cadastradas com uso do botão de IA | A levantar — não há instrumentação hoje *(premissa — confirme ou corrija)* | A definir | A definir | A definir | Dono do produto |

## 6. Milestones

### Milestone 1: Assistente de IA sugere estoque, valor e data no cadastro de venda futura

**Por que é um marco:** o seller ganha uma forma de cadastrar venda futura sem estimar os
três campos de cabeça, com garantia de que a IA não inventa uma justificativa de negócio
fantasiosa quando o produto não é sazonal.

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Sugestão nunca grava dado sem ação explícita do seller — validado em teste manual (não registrado)
- [x] Produto sem sazonalidade real nunca recebe motivo `sazonalidade_conhecida` — validado em teste manual com vergalhão (motivo retornado: `sem_base_conservador`)
- [x] Data sugerida é sempre >= data atual

**Aprovador:** Dono do produto (Andreia)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| IA ocasionalmente escolhe `sazonalidade_conhecida` para produto não-sazonal, apesar da instrução | Médio — sugestão de baixa qualidade, mas seller ainda revisa antes de gravar | Monitorar uso real; se recorrente, adicionar validação determinística (como em `coletiva-precos.ts`) | Monitorando |
| Custo de chamada à API Anthropic cresce com uso do botão | Baixo — modelo Haiku, poucos tokens por chamada | Reusa `ANTHROPIC_API_KEY` já orçada para outras features de IA do seller | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| `ANTHROPIC_API_KEY` configurada no ambiente | Externa | Ativa em produção | Sem a chave, botão retorna erro claro e não bloqueia o cadastro manual |

## 8. Referências

- [PR #259](https://github.com/Schneider-Gr/industria24hIA/pull/259) — implementação e merge da feature em produção
- `src/app/(seller)/seller/produtos/ia-actions.ts` — padrão de assistente de IA reusado (curadoria de produto)
- `src/lib/agentes/coletiva-precos.ts` — padrão de referência para validação determinística de sugestão de IA, caso vire necessário aqui

## 9. Registro de Decisões

- **2026-08-10:** Assistente não pode inventar sazonalidade para produto não-agrícola.
  Motivo: teste manual com produto industrial (vergalhão) mostrou a IA produzindo uma
  justificativa de "ciclo de produção" plausível mas fabricada; corrigido adicionando
  campo `motivo` obrigatório e cálculo determinístico de intervalo histórico.
- **2026-08-10:** Feature implementada e mergeada direto em produção (PR #259) antes deste
  PRD ser escrito — PRD documenta retroativamente o comportamento já entregue. *(premissa
  — confirme ou corrija: registrar aqui como prática aceita para features pequenas e já
  validadas manualmente, ou preferir sempre PRD antes da implementação daqui em diante)*
