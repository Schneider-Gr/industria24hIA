# arquitetura-migrations-por-modulo Specification

## Purpose
Reduzir a colisão de numeração de prefixo em `supabase/migrations/` — já
ocorrida 3 vezes entre sessões/devs concorrentes — reservando uma faixa de
números por módulo/dono, sem substituir a checagem automática já existente no
CI.
## Requirements
### Requirement: Faixa de numeração reservada por módulo
O sistema SHALL reservar uma faixa de números de migration por módulo de
domínio, atribuída a partir do momento em que mais de um dev estiver
ativamente criando migrations no repositório.

#### Scenario: Dois módulos criam migration na mesma janela de tempo
- **WHEN** os módulos `seller` e `afiliado` precisam de migration nova no
  mesmo período
- **THEN** cada um usa o próximo número disponível dentro da própria faixa
  reservada, sem necessidade de coordenação manual entre os devs

#### Scenario: Apenas 1 dev cria migrations
- **WHEN** só existe 1 pessoa criando migrations no repositório (estado atual)
- **THEN** a faixa por módulo ainda não precisa estar definida com números
  concretos — a definição fica para quando o segundo dev começar a commitar
  migrations

### Requirement: CI continua como rede de segurança independente das faixas
O sistema SHALL manter o job `migrations-lint` do CI como checagem automática
de colisão de prefixo, funcionando independente de as faixas por módulo
estarem ou não em uso.

#### Scenario: Colisão de prefixo apesar da faixa reservada
- **WHEN** uma migration é criada fora da faixa esperada do módulo e colide
  com o prefixo de outra migration existente
- **THEN** o job `migrations-lint` do CI bloqueia o PR, do mesmo jeito que
  bloquearia sem faixas reservadas

### Requirement: Redefinição de faixa é decisão pontual
O sistema SHALL tratar o esgotamento de uma faixa de numeração como decisão
pontual do dono do repositório, fora do fluxo normal de PR de feature.

#### Scenario: Faixa de um módulo se esgota
- **WHEN** um módulo consome todos os números disponíveis em sua faixa
  reservada
- **THEN** o dono do repositório define uma nova faixa para aquele módulo,
  documentando a mudança, sem que isso bloqueie o PR de feature em andamento

