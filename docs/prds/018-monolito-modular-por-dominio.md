---
prd_number: "018"
status: rascunho
priority: alta
created: 2026-08-19
issue: "#324"
depends_on: []
references:
  - "https://github.com/Schneider-Gr/industria24hIA/pull/323"
---

# PRD 018: Monolito Modular por Domínio

## 1. Contexto

- **Produto/área**: plataforma industria24.com.br como um todo — não é uma feature de
  usuário final, é uma mudança estrutural de como o time trabalha no repositório.
- **Estado atual**: o código é organizado só por rota do App Router
  (`(admin)`, `(seller)`, `(afiliado)`, `(parceiro)` + rotas públicas soltas), sem
  separação por domínio de negócio nem por camada técnica. Não existe `CODEOWNERS`.
  122 arquivos em `src/app/` acessam o Supabase diretamente, misturando em parte
  leitura simples (idiomática de server component) e em parte regra de negócio que
  deveria estar isolada e testável. Apenas 25 arquivos vivem hoje em `src/lib/*.ts`
  como regra de negócio nomeada, e só 6 têm teste companheiro, apesar de o `CLAUDE.md`
  do projeto já declarar TDD obrigatório para código novo.
- **Problema**: dois devs novos vão entrar no repositório além do dono atual. Sem
  perímetro de dono claro por pasta, PRs concorrentes tendem a colidir (já aconteceu
  3x com numeração de migrations, por exemplo). Sem separação de camada, regra de
  negócio nova continua nascendo dentro de `page.tsx`/`route.ts`, dificultando teste
  e revisão. O impacto de não resolver: revisão de código cada vez mais cara conforme
  o time cresce, e risco de regressão em fluxos sensíveis (repasse, comissão, PIX)
  por lógica não testada espalhada pela UI.

> **Contexto técnico** (stack, convenções de pasta, TDD) vive no `CLAUDE.md` do
> projeto — este PRD referencia a convenção, não a redefine tecnicamente.

## 2. Solução Proposta

### Visão de produto

- Modularizar o repositório por **domínio de negócio** (não por camada técnica),
  espelhando os 6 perímetros já naturais no produto: catálogo/compra, seller,
  afiliado, logística/parceiro, admin/plataforma e pagamentos/financeiro.
- Formalizar quem é dono de cada módulo via `CODEOWNERS`, mesmo enquanto os 2 devs
  novos ainda compartilham uma única conta GitHub.
- Migrar a lógica de negócio hoje presa em páginas/rotas para `src/lib/<modulo>/`
  de forma **incremental** (padrão strangler fig): todo PR novo já nasce modular;
  código antigo só migra quando é tocado por outro motivo (bug, feature).
- Prevenir colisão de numeração de `supabase/migrations/` atribuindo faixa de
  números por módulo/dono.

### Decisões de produto

1. **Eixo primário é domínio, não camada técnica** — CODEOWNERS é *path-based*;
   separar por camada resolveria acoplamento a Supabase mas não resolveria dois
   devs pisando no PR um do outro. *(decisão já validada em brainstorm com o dono
   do produto)*
2. **Sem big-bang** — parar semanas para reestruturar tudo de uma vez é risco alto
   demais num sistema com dinheiro real (repasse, comissão, PIX) em produção com
   1 dev sênior hoje. Migração é PR a PR, sob demanda.
3. **CODEOWNERS nasce com todos os paths apontando para o mesmo e-mail** enquanto
   os devs dividem conta GitHub — o valor pleno de gate de review só existe quando
   as contas forem individuais, mas a estrutura de módulos já fica correta desde já.
4. **Sem sequenciamento definido de qual módulo migra primeiro** — decisão adiada
   para quando os 2 devs entrarem de fato. *(decisão do dono do produto, registrada
   explicitamente como em aberto, não esquecida)*

> Nenhuma decisão arquitetural durável nova é introduzida aqui (não há escolha de
> banco, auth ou lib estruturante) — a convenção de pastas por domínio já está
> descrita no `CLAUDE.md` do projeto; este PRD formaliza a extensão dela, não cria
> um ADR novo.

### Fora do escopo

- **Monorepo real com workspaces/pacotes** (ex.: Turborepo) com boundary forçada
  por compilador/lint — os módulos vivem dentro da mesma app Next.js, com boundary
  só de convenção + CODEOWNERS. *(premissa — confirme ou corrija: se o acoplamento
  cruzado voltar a crescer depois da migração incremental, isso é decisão futura
  separada.)*
- **Correção de bugs não relacionados à modularização** — cruzamento com incidentes
  já conhecidos (comissão de afiliado sem indicação, transportadora fake em prod)
  é só citado como contexto de risco, não reaberto aqui.
- **Retrofit de teste em `lib/` já existente sem motivo** — continua não sendo
  exigido; só quando o strangler fig tocar o arquivo por outro motivo, seguindo a
  regra já vigente no `CLAUDE.md`.
- **Renumeração de migrations já existentes** — só o processo daqui para frente
  (faixa de números por módulo). Migrations passadas não são tocadas.
- **Criação de contas GitHub individuais para os 2 devs** — decisão/ação de
  infraestrutura de fora deste PRD.

## 3. Funcionalidades

### US01: Convenção de módulos por domínio aplicada a todo PR novo

Como dev do time (atual ou futuro), quero que toda regra de negócio nova viva em
`src/lib/<modulo>/` com teste companheiro, para que a lógica pare de nascer
misturada dentro de `page.tsx`/`route.ts` e fique testável e revisável por módulo.

**Rules:**
- Módulos de domínio reconhecidos: `catalogo-compra`, `seller`, `afiliado`,
  `logistica-parceiro`, `admin-plataforma`, `pagamentos-financeiro`, mais um bloco
  de plataforma compartilhada (`src/lib/supabase/`, `auth`, `rate-limit`, config
  de raiz) que exige revisão de qualquer um que tocar.
- Todo PR que introduz regra de negócio nova (preço, comissão, repasse, disputa,
  frete etc.) a implementa em `src/lib/<modulo>/*.ts` com `.test.ts` companheiro,
  seguindo o ciclo Red-Green-Refactor já descrito no `CLAUDE.md`.
- Código pré-existente só migra para a convenção quando um PR toca aquele arquivo
  por outro motivo (bug ou feature) — sem prazo de retrofit total. *(premissa —
  confirme ou corrija: mantém a regra de "não forçar migração" já vigente para
  testes, estendida à reorganização de pasta.)*

**Edge cases:**
- PR novo mistura módulos diferentes (ex.: toca `seller` e `afiliado` no mesmo PR)
  → sinalizar na revisão que múltiplos donos precisam revisar; recomendar split em
  PRs menores quando viável. *(premissa — confirme ou corrija)*
- Arquivo de plataforma compartilhada é alterado por engano dentro de um módulo de
  domínio → revisão bloqueia até o dono da plataforma compartilhada aprovar.
  *(premissa — confirme ou corrija)*

### US02: CODEOWNERS mapeado por domínio

Como dono do repositório, quero que `.github/CODEOWNERS` reflita os módulos de
domínio, para que cada PR já aponte o dono esperado do path alterado, mesmo antes
de existirem contas individuais para os novos devs.

**Rules:**
- Cada um dos 6 módulos de domínio e o bloco de plataforma compartilhada tem
  entrada própria em `CODEOWNERS`, mapeando as pastas descritas em US01.
- Enquanto os devs dividem uma única conta GitHub, todas as entradas apontam para
  essa conta — o arquivo documenta a estrutura-alvo, não substitui um gate de
  review real nesse período. *(já entregue via PR #323, referenciado em §8)*
- Quando cada dev tiver conta individual, a atualização é só trocar o e-mail de
  cada bloco pelo dono real — sem redesenhar os módulos.

**Edge cases:**
- Path novo criado que não se encaixa em nenhum módulo existente (ex.: feature de
  domínio novo) → cai no dono padrão (`*`) até alguém atualizar o CODEOWNERS com a
  entrada específica. *(premissa — confirme ou corrija)*

### US03: Faixa de numeração de migrations por módulo

Como responsável por revisar migrations, quero que cada módulo tenha uma faixa de
números reservada em `supabase/migrations/`, para reduzir a colisão de prefixo que
já ocorreu 3 vezes entre sessões/devs concorrentes.

**Rules:**
- Dono de cada módulo é dono da faixa de números de migration daquele domínio.
  *(premissa — confirme ou corrija: a faixa exata por módulo fica a definir junto
  com o time no momento em que os 2 devs entrarem, já que hoje só há 1 pessoa
  criando migrations.)*
- O job `migrations-lint` do CI continua sendo a checagem automática de colisão de
  prefixo — este PRD não substitui essa checagem, só reduz a chance de ela disparar.

**Edge cases:**
- Dois módulos diferentes precisam de migration na mesma janela de tempo → cada um
  usa sua própria faixa, sem coordenação manual de número. *(premissa — confirme
  ou corrija)*
- Faixa de um módulo se esgota → redefinir faixas é decisão pontual do dono do
  repositório, fora do fluxo normal de PR. *(premissa — confirme ou corrija)*

## 4. Fluxo de Negócio

Não aplicável — a ramificação de regra desta feature já é coberta pelos Edge cases
das USs (não há jornada de usuário final envolvida; é processo interno de
engenharia).

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| `.github/CODEOWNERS` existe e cobre os 6 módulos + plataforma compartilhada | sem isso, PRs continuam sem perímetro de dono | ler o arquivo no repo e conferir contra a lista de módulos de US01/US02 |
| PR novo que introduz regra de negócio traz a lógica em `src/lib/<modulo>/*.ts` com `.test.ts` companheiro | é o mecanismo que reduz o acoplamento direto a Supabase em `src/app/` ao longo do tempo | checklist de revisão de PR / CI `test` continua verde |
| CI `migrations-lint` não acusa colisão de prefixo após a faixa por módulo entrar em uso | é o sintoma direto do problema que motivou US03 | rodar `ls supabase/migrations \| grep -oE '^[0-9]{4}' \| sort \| uniq -d` sem retorno |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Arquivos em `src/app/` com `createClient` direto misturando regra de negócio | 122 arquivos hoje chamam `createClient` (levantamento desta sessão, contagem grep) — *A levantar: quantos desses são leitura simples idiomática vs. regra de negócio misturada* | reduzir a proporção com regra de negócio misturada a cada PR que tocar o arquivo | Contínuo (strangler fig, sem prazo fixo) | não regressão — nenhum PR novo pode aumentar a contagem | dono do módulo tocado |
| Colisões de prefixo de migration | 3 colisões já registradas em memória de projeto antes deste PRD | 0 colisões após faixas por módulo em uso | A partir da entrada dos 2 devs novos | 0 | dono do repositório |

## 6. Milestones

### Milestone 1: Fundação de modularização

**Por que é um marco:** é o ponto em que o repositório passa a ter perímetro de
dono documentado e a convenção de onde colocar código novo — pré-requisito para
qualquer trabalho paralelo de 2 devs sem colisão.

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] `.github/CODEOWNERS` mergeado em `master` cobrindo os 6 módulos + plataforma compartilhada — PR #323, estendido com `/src/lib/catalogo-compra/` no PR #337
- [x] Convenção de `src/lib/<modulo>/` documentada no `CLAUDE.md` do projeto — PR #325; validada em PR real (PR #337, moveu `vitrine-home.ts`/`galerias.ts` para `src/lib/catalogo-compra/`)

**Aprovador:** dono do repositório (industria24hs-creator) — aprovado 2026-08-20

### Milestone 2: Prevenção de colisão de migrations por módulo

**Por que é um marco:** fecha o segundo maior ponto de atrito concreto já
registrado (colisão de migration entre sessões/devs), na prática antes de o
segundo e terceiro dev começarem a commitar migrations.

**Funcionalidades:** US03

**Status (2026-08-20):** mecanismo definido, execução deliberadamente adiada.
A spec `arquitetura-migrations-por-modulo` já documenta que a faixa
concreta por módulo só precisa ser atribuída "a partir do momento em que
mais de um dev estiver ativamente criando migrations" — cenário "Apenas 1
dev cria migrations" cobre o estado atual como válido sem números
definidos. `migrations-lint` no CI continua como rede de segurança
independente das faixas. Sem 2º dev commitando migrations, não há como
cumprir a 2ª linha do checklist abaixo na prática.

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Faixas de numeração por módulo definidas e documentadas — adiado por desenho (ver Status acima), não é bloqueio técnico
- [ ] `migrations-lint` sem colisão desde a adoção das faixas — não aplicável até haver faixas concretas

**Aprovador:** dono do repositório (industria24hs-creator)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| CODEOWNERS com 1 conta só passa falsa sensação de gate ativo | Médio | descrito explicitamente na descrição do PR #323 e neste PRD; reforçar quando os 2 devs entrarem | Mitigado |
| Strangler fig sem prazo pode nunca "completar" a modularização se ninguém tocar certos arquivos antigos | Médio | aceito conscientemente — a régua é "todo PR deixa o arquivo mais modular do que encontrou", não um projeto com fim definido | Monitorando |
| Faixas de migration por módulo mal dimensionadas geram nova colisão | Baixo | CI `migrations-lint` continua como rede de segurança automática independente das faixas | Mitigado |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Contas GitHub individuais para os 2 devs novos | Externa (decisão de custo/acesso do dono do produto) | Pendente | Milestone 1 segue entregável sem isso; só o gate de review pleno de CODEOWNERS fica adiado |
| Entrada efetiva dos 2 devs no time | Externa | Pendente | Sequenciamento de qual módulo migra primeiro (fora de escopo deste PRD) só se resolve quando isso acontecer |

## 8. Referências

- [Issue #324 — ticket de acompanhamento](https://github.com/Schneider-Gr/industria24hIA/issues/324) — rastreia as tasks pendentes deste PRD
- [PR #323 — Create CODEOWNERS file for repository ownership](https://github.com/Schneider-Gr/industria24hIA/pull/323) — entrega já feita de US02, mapeando os 6 módulos
- `openspec/changes/monolito-modular-industria24/` — proposal, design e 3 specs (`arquitetura-modularizacao-dominio`, `arquitetura-codeowners-dominio`, `arquitetura-migrations-por-modulo`) derivadas deste PRD
- `CLAUDE.md` do projeto (`Industria24/web/CLAUDE.md`) — convenção de `src/lib/*.ts` e TDD já declarada, que este PRD estende para `src/lib/<modulo>/`
- `openspec/specs/` (19 specs existentes, ex. `seller-afiliados`, `admin-disputas`) — mapa de bounded contexts que inspirou a modulação por domínio proposta aqui

## 9. Registro de Decisões

- **2026-08-19:** Eixo de modularização escolhido é domínio de negócio, não camada
  técnica. Motivo: CODEOWNERS é path-based e o gatilho real do pedido é dar
  perímetro de dono claro por PR aos 2 devs novos — separar por camada técnica
  resolveria acoplamento a Supabase mas não resolveria PRs colidindo entre devs.
- **2026-08-19:** Migração será strangler fig, não big-bang. Motivo: sistema com
  dinheiro real (repasse, comissão, PIX) em produção e apenas 1 dev sênior hoje —
  parar semanas para reestruturar tudo de uma vez é risco alto demais.
- **2026-08-19:** Granularidade de módulo fixada em 6 (por área/persona), não nos
  19 domínios finos do `openspec/specs/`. Motivo: escolha explícita do dono do
  produto — granularidade fina demais aumentaria o número de entradas de
  CODEOWNERS sem ganho proporcional de precisão de dono nesta fase.
- **2026-08-19:** Sequenciamento de qual módulo migra primeiro fica
  deliberadamente em aberto. Motivo: decisão do dono do produto de adiar essa
  escolha para quando os 2 devs entrarem de fato, em vez de travar agora.
