## Context

O gatilho real desta mudança é dar a cada dev um perímetro de dono claro no
GitHub, não uma reestruturação técnica por si só. `CODEOWNERS` é *path-based*:
resolve "quem revisa o quê" só se o path já corresponder a um dono de negócio.
Por isso o eixo primário de modularização é **domínio**, não camada técnica —
decisão validada em brainstorm de arquitetura com o dono do produto em
2026-08-19 (ver PRD 018, Registro de Decisões).

`openspec/specs/` já lista 19 domínios finos (`seller-afiliados`,
`seller-compras-coletivas`, `admin-disputas` etc.) — mapa de bounded contexts
que inspirou a modulação, mas granularidade fina demais para CODEOWNERS nesta
fase (aumentaria entradas sem ganho proporcional de precisão de dono, com só
1-3 pessoas no repo). A granularidade escolhida foi 6 módulos grandes por
área/persona, bater com os route groups já existentes do App Router.

## Goals / Non-Goals

**Goals:**
- Perímetro de dono documentado por módulo, mesmo antes de contas individuais
  existirem.
- Convenção clara de onde regra de negócio nova deve viver, sem exigir
  reestruturação do código existente.
- Redução da colisão de numeração de migration entre devs/sessões
  concorrentes.

**Non-Goals:**
- Não é um monorepo real com workspaces/pacotes e boundary forçada por
  compilador/lint — a separação aqui é só convenção de pastas + CODEOWNERS.
- Não migra código existente de uma vez (não é um projeto de "modularização
  completa" com prazo) — é strangler fig, PR a PR.
- Não corrige bugs de negócio já conhecidos que cruzam com os módulos
  (comissão de afiliado sem indicação, transportadora fake) — só os cita como
  contexto de risco no PRD 018.
- Não cria contas GitHub individuais para os 2 devs novos — decisão de
  custo/acesso fora deste change.

## Decisions

### Decisão 1: Domínio como eixo primário, camada técnica como consequência

Dentro de cada módulo de domínio, a separação por camada técnica (`app` →
apresentação, `lib/<modulo>/` → serviço/regra de negócio, `components/<modulo>/`
→ UI) acontece como parte da mesma extração — não é um projeto cross-cutting
separado. **Alternativa considerada e descartada**: modularizar primeiro por
camada técnica (extrair todo `lib/` genérico antes de separar por domínio) —
descartada porque não resolve o problema real de CODEOWNERS/colisão de PR entre
devs, que é path-based e domain-shaped.

### Decisão 2: Strangler fig, não big-bang

**Alternativa considerada e descartada**: reestruturar tudo de uma vez antes de
liberar os 2 devs — descartada porque o sistema tem dinheiro real em produção
(repasse, comissão, PIX) e hoje há só 1 dev sênior; parar semanas de feature
para reestruturar é risco desproporcional ao ganho.

### Decisão 3: CODEOWNERS nasce com 1 e-mail para todos os paths

Enquanto os 2 devs futuros dividem uma única conta GitHub, todo path do
CODEOWNERS aponta para essa conta. Isso significa que, nesta fase, o arquivo
funciona como **documentação da estrutura-alvo**, não como gate de review real
(GitHub não impede autoaprovação da própria conta). Registrado explicitamente
para não passar falsa sensação de gate ativo — ver `arquitetura-codeowners-dominio/spec.md`.

### Decisão 4: Faixa de migration por módulo, sem números fixados ainda

A faixa exata de números por módulo fica a definir no momento em que os 2 devs
entrarem de fato (hoje só 1 pessoa cria migrations, então não há colisão real
ainda). O CI `migrations-lint` continua como rede de segurança automática
independente das faixas.

## Risks / Trade-offs

- **CODEOWNERS sem gate real** → mitigado por documentação explícita da
  limitação, tanto no PR #323 quanto no PRD 018 e nesta spec.
- **Strangler fig sem prazo definido** → aceito conscientemente; a régua é
  "todo PR deixa o arquivo mais modular do que encontrou", não um projeto com
  data de término. Risco de nunca "completar" se código antigo nunca for
  tocado — aceitável porque o objetivo é reduzir acoplamento novo, não
  eliminar acoplamento antigo por si só.
- **Faixas de migration mal dimensionadas** → mitigado pelo `migrations-lint`
  do CI, que já detecta colisão de prefixo independente de qualquer faixa
  reservada.

## Migration Plan

Não há migração de dado ou de sistema em produção — é reorganização de
convenção de código e processo de revisão. Sequência:

1. `.github/CODEOWNERS` (já mergeado via PR #323).
2. Documentar convenção `src/lib/<modulo>/` e strangler fig no `CLAUDE.md`.
3. Documentar arquitetura-alvo em `docs/trd.md` (TRD).
4. A partir daí, todo PR novo com regra de negócio segue a convenção — sem
   marco de "migração concluída".

## Open Questions

- Sequenciamento de qual módulo migra primeiro: deliberadamente em aberto,
  decisão adiada para quando os 2 devs entrarem (ver PRD 018, Fora do escopo).
- Números exatos da faixa de migration por módulo: a definir no momento da
  entrada dos 2 devs (ver `arquitetura-migrations-por-modulo/spec.md`).
