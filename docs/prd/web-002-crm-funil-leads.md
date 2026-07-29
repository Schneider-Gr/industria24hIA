---
prd_number: "002"
status: rascunho
priority: média
created: 2026-07-28
issue: ""
depends_on: ["001"]
references:
  - "docs/prds/001-bot-atendimento.md"
---

# PRD 002: CRM — Gestão do Funil de Leads

## 1. Contexto

- **Produto/área**: Indústria 24h, marketplace de Manaus. Área comercial/atendimento — evolução direta do módulo de captura de leads entregue no PRD 001 (bot de atendimento).
- **Estado atual**: o bot de atendimento (PRD 001) captura leads comerciais (ex.: "quero virar vendedor") e os lista em `/admin/leads` com um status simples (novo, em_contato, convertido, descartado) que o time comercial muda manualmente. Não há histórico de interação por lead, não há dono/responsável atribuído, e não há lembrete de follow-up — o painel hoje é uma lista plana com troca de status, sem contexto de "o que já foi feito com esse lead".
- **Problema**: sem histórico e sem dono, um lead pode ser contatado por duas pessoas do time comercial ao mesmo tempo, ou esquecido sem que ninguém perceba que está parado há dias. Isso derruba a taxa de conversão de leads que o PRD 001 se propôs a aumentar — captar o lead sem um funil de acompanhamento estruturado captura o dado, mas não fecha a venda. *(premissa — confirme ou corrija: esse é o principal driver, não outro tipo de perda)*

> **Contexto técnico** (stack, arquitetura, padrões) vive no TRD (`docs/trd.md`), carregado automaticamente na implementação. Aqui: a feature estende a tabela `leads` e o painel `/admin/leads` já existentes (migration `0088`, PR #123) — não cria um novo sistema de CRM do zero.

## 2. Solução Proposta

### Visão de produto

- Cada lead ganha uma linha do tempo de interações (nota, ligação, mensagem enviada) registrada pelo time comercial, não só um status isolado.
- Todo lead tem um responsável (dono) — atribuído manualmente ou automaticamente por rodízio simples *(premissa — confirme ou corrija: qual o critério de atribuição inicial)*.
- Lead que fica "novo" ou "em_contato" sem nenhuma interação por um período configurável aparece destacado como atrasado no painel, para evitar esquecimento.
- O painel `/admin/leads` ganha filtro por responsável e por "atrasado", além do filtro por status já existente.

### Decisões de produto

1. O funil de status permanece o mesmo do PRD 001 (novo, em_contato, convertido, descartado) — esta feature adiciona histórico e responsável, não reformula os estágios do funil. *(premissa — confirme ou corrija)*
2. Registrar uma interação (nota, ligação etc.) não muda o status automaticamente — mudança de status continua sendo uma ação manual e explícita do time comercial, para evitar status incorreto por engano.
3. O prazo que define um lead como "atrasado" é o mesmo para todos os leads nesta primeira versão, sem regra diferente por origem ou tipo de interesse. *(premissa — confirme ou corrija)*

### Fora do escopo

- Automação de follow-up (disparo automático de mensagem/e-mail para o lead) — esta feature só sinaliza atraso para o time humano agir, não age sozinha.
- Pipeline de vendas com valor monetário associado ao lead (ex.: ticket estimado, forecast de receita) — não há dado de valor/negociação nesta versão.
- Relacionamento com clientes já convertidos em compradores recorrentes (CRM de pós-venda) — isso é outra feature, fora deste PRD.
- Distribuição automática de leads por território, carga de trabalho ou algoritmo — atribuição de responsável é manual (ou rodízio simples), sem otimização.
- Integração com CRM externo (Salesforce, HubSpot etc.) — o funil vive só dentro do painel do próprio industria24h.

## 3. Funcionalidades

### US01: Registrar histórico de interação com um lead

Como pessoa do time comercial, quero registrar uma nota ou interação (ligação, mensagem enviada, reunião) num lead, para que qualquer pessoa da equipe veja o que já foi feito sem depender da minha memória.

**Rules:**
- Toda interação registrada guarda quem registrou e quando, além do conteúdo da nota.
- O histórico de um lead é ordenado cronologicamente, do mais recente para o mais antigo.
- Registrar uma interação não altera o status do lead automaticamente.

**Edge cases:**
- Duas pessoas registram interação no mesmo lead quase ao mesmo tempo → ambas as interações são salvas, nenhuma sobrescreve a outra. *(premissa — confirme ou corrija: histórico é append-only, não há edição/exclusão de nota de terceiro)*
- Nota vazia ou só espaços → bloqueada, não salva registro sem conteúdo.

### US02: Atribuir responsável por um lead

Como pessoa do time comercial, quero que cada lead tenha um responsável definido, para que fique claro quem deve agir e evitar que dois vendedores contatem a mesma pessoa.

**Rules:**
- Um lead tem no máximo um responsável ativo por vez.
- O responsável pode ser reatribuído manualmente por um administrador ou pelo próprio responsável atual. *(premissa — confirme ou corrija: quem tem permissão para reatribuir)*
- O painel `/admin/leads` permite filtrar leads por responsável.

**Edge cases:**
- Lead novo sem responsável atribuído → aparece destacado como "sem dono" no painel, para não passar despercebido. *(premissa — confirme ou corrija)*
- Responsável atribuído é removido/desativado do sistema → lead permanece com o histórico intacto, mas fica sinalizado para reatribuição. *(premissa — confirme ou corrija: cenário raro, comportamento exato pode ser definido na implementação)*

### US03: Ver leads atrasados no funil

Como pessoa do time comercial, quero identificar rapidamente quais leads estão parados há muito tempo sem interação, para agir antes de perder a oportunidade.

**Rules:**
- Um lead é considerado "atrasado" quando está em status "novo" ou "em_contato" e não recebe nenhuma interação registrada por mais que um prazo definido (ex.: 3 dias úteis). *(premissa — confirme ou corrija o prazo exato)*
- Leads atrasados aparecem destacados visualmente no painel `/admin/leads` e podem ser filtrados isoladamente.
- Leads em status "convertido" ou "descartado" nunca contam como atrasados, independente do tempo parado.

**Edge cases:**
- Lead atrasado recebe uma interação registrada → deixa de ser considerado atrasado imediatamente, mesmo que o status não mude.
- Lead criado fora do horário comercial (fim de semana, feriado) → o prazo de atraso considera dias corridos ou só dias úteis *(a definir — impacta diretamente o cálculo, não dá para assumir com segurança)*.

## 4. Fluxo de Negócio

```
Lead criado (via bot de atendimento — PRD 001)
   │
   ▼
Tem responsável atribuído?
   ├── não ──▶ Aparece como "sem dono" no painel ──▶ Admin atribui responsável
   └── sim ──▶ Responsável trabalha o lead

Responsável registra interação?
   ├── sim, dentro do prazo ──▶ Lead permanece "em dia"
   └── não, prazo estourado ──▶ Lead marcado como "atrasado" no painel

Status muda manualmente para:
   ├── convertido ──▶ Sai do funil de acompanhamento de atraso
   └── descartado ──▶ Sai do funil de acompanhamento de atraso
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Toda interação registrada preserva autor e timestamp, nunca é perdida ou sobrescrita | Histórico é a base de confiança do time comercial; perder registro reintroduz o problema que a feature resolve | Registrar duas interações no mesmo lead por usuários diferentes e conferir que ambas aparecem no histórico |
| Lead sem responsável fica visualmente destacado em até a próxima carga do painel | Lead "órfão" é o cenário que mais gera perda de conversão | Criar lead sem atribuir dono e verificar destaque no painel |
| Cálculo de "atrasado" reflete o prazo configurado com precisão de 1 dia *(premissa — confirme o limiar aceitável)* | Time comercial precisa confiar no sinal para priorizar o dia de trabalho | Criar lead, aguardar o prazo, conferir mudança de destaque no painel |
| Filtro por responsável e por atrasado retorna resultado correto | Funcionalidade central do painel evoluído — sem filtro confiável, a feature não é usável no dia a dia | Aplicar filtro com múltiplos leads de diferentes responsáveis/status e conferir resultado |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Taxa de conversão de lead (novo → convertido) | A levantar — painel `/admin/leads` não tem histórico suficiente ainda para baseline confiável | Aumento em relação ao baseline coletado nos primeiros 30 dias desta feature | 60 dias após lançamento | — | Time comercial |
| Tempo médio até a primeira interação registrada após criação do lead | A levantar | Reduzir para dentro do prazo de "atrasado" definido em US03 | 30 dias | — | Time comercial |
| % de leads sem responsável atribuído em um dado momento | A levantar | Próximo de 0% | 30 dias | — | Time comercial |

## 6. Milestones

### Milestone 1: Funil de leads com histórico e dono

**Por que é um marco:** transforma o painel de lista plana em ferramenta de trabalho real do time comercial — dá contexto (histórico) e responsabilidade (dono) a cada lead, resolvendo a perda de conversão por lead esquecido ou duplamente contatado.

**Funcionalidades:** US01, US02

**Checklist de aceite:**
- [ ] Toda interação registrada preserva autor e timestamp, nunca é perdida ou sobrescrita
- [ ] Lead sem responsável fica visualmente destacado no painel

**Aprovador:** Time comercial + Andréia

### Milestone 2: Alerta de lead atrasado

**Por que é um marco:** fecha o ciclo de acompanhamento — sem isso, um lead com dono pode ainda ficar esquecido; com o alerta, o time tem um sinal ativo de priorização.

**Funcionalidades:** US03

**Checklist de aceite:**
- [ ] Cálculo de "atrasado" reflete o prazo configurado
- [ ] Filtro por atrasado retorna resultado correto

**Aprovador:** Time comercial

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Prazo de "atrasado" mal calibrado (curto demais gera ruído, longo demais perde o efeito) | Médio — time ignora o alerta se ele for ruidoso | Validar o prazo com o time comercial antes de fixar o valor definitivo | Pendente |
| Falta de baseline de conversão anterior a esta feature | Baixo — não bloqueia a entrega, mas dificulta medir sucesso real | Coletar baseline nos primeiros 30 dias pós-lançamento como ponto de partida | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 001 — bot de atendimento (tabela `leads`, painel `/admin/leads`) | Interna | Em produção (falta ativação plena do WhatsApp) | Sem a tabela/painel base, esta feature não tem onde se apoiar |

## 8. Referências

- [PRD 001 — Bot de Atendimento](001-bot-atendimento.md) — origem da tabela `leads` e do painel `/admin/leads` que esta feature estende

## 9. Registro de Decisões

- **2026-07-28:** escopo restrito a "gestão do funil de leads" (histórico, dono, atraso), descartando neste PRD as opções de CRM de comprador (visão 360°/LTV) e CRM de seller (saúde de conta/onboarding), levantadas como alternativas mais amplas de "CRM industria24h". Motivo: escolha explícita do usuário entre as opções apresentadas — as outras duas permanecem candidatas a PRDs futuros e independentes.
- **2026-07-28:** dependência de `001` registrada porque esta feature estende diretamente a tabela `leads` e o painel `/admin/leads` criados naquele PRD — não é apenas "do mesmo domínio", a implementação pressupõe o schema já existente.
