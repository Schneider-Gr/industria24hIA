## Purpose

Definir checklists de processo, carregados por contexto, que uma sessão de agente de IA segue antes de agir em quatro pontos de risco de qualidade específicos de código vibe-coded neste projeto: implementação de regra de negócio, teste de lógica de negócio, alteração de schema, e operação num checkout git compartilhado. O objetivo é reduzir incoerência arquitetural, duplicação de trabalho entre sessões, falso-positivo de teste e drift de schema — sem exigir nova ferramenta ou automação, só disciplina de leitura antes de agir.

## ADDED Requirements

### Requirement: Checagem de módulo antes de implementar regra de negócio
Uma sessão de agente que for implementar uma regra de negócio nova (preço, coletiva, comissão, repasse, disputa, frete ou equivalente) SHALL primeiro identificar o módulo de domínio correspondente em `CODEOWNERS` e buscar (grep/leitura) se uma implementação da mesma regra já existe em `src/lib/<modulo>/` ou em módulo vizinho, antes de criar uma nova.

#### Scenario: Regra de negócio nova sem checagem prévia
- **WHEN** uma sessão começa a escrever uma função de cálculo de preço, comissão ou repasse sem antes buscar se já existe implementação equivalente em outro módulo
- **THEN** a skill `qualidade-vibe-coding` interrompe o fluxo normal de implementação e exige a busca antes de prosseguir

#### Scenario: Regra de negócio já existe em módulo vizinho
- **WHEN** a busca encontra uma implementação existente da mesma regra em módulo diferente do que a sessão pretendia usar
- **THEN** a sessão relata o achado ao usuário e pede decisão (reusar, migrar, ou justificar a duplicação) em vez de criar uma segunda implementação silenciosamente

### Requirement: Checagem de atividade concorrente antes de operar em checkout compartilhado
Uma sessão de agente que for commitar, trocar de branch ou dar push no checkout primário (raiz do repositório, fora de `.claude/worktrees` ou de um `web-*` isolado) SHALL primeiro checar `git reflog` e o estado do branch atual em busca de atividade de outra sessão nas últimas operações, antes de prosseguir.

#### Scenario: Checkout compartilhado sem checagem de reflog
- **WHEN** uma sessão está prestes a commitar ou trocar de branch no checkout primário sem ter consultado `git reflog` nem `git status` recentemente
- **THEN** a skill `qualidade-vibe-coding` exige essa checagem antes da ação

#### Scenario: Reflog revela sessão concorrente ativa
- **WHEN** o `git reflog` mostra commits ou trocas de branch feitos por outra sessão nos últimos minutos, na mesma branch em que a sessão atual pretende operar
- **THEN** a sessão informa isso ao usuário antes de commitar, e evita operações destrutivas (`reset --hard`, `checkout --force`) que possam descartar o trabalho da outra sessão

### Requirement: Teste de regra de negócio não mocka a própria unidade testada
Um `.test.ts` companheiro de uma função em `src/lib/*.ts` que carregue regra de negócio SHALL exercitar a implementação real da função (não um mock ou stub da própria função) e, quando depender do Supabase, SHALL cobrir ao menos um cenário onde a chamada ao banco retorna um resultado que faz o teste falhar se a validação de negócio estiver ausente — não apenas um cenário de sucesso genérico.

#### Scenario: Teste mocka a função sob teste
- **WHEN** um `.test.ts` substitui a própria função que deveria testar por um mock que sempre retorna o valor esperado
- **THEN** o teste é considerado inválido para efeito de cobertura de regra de negócio, mesmo que passe no CI

#### Scenario: Teste só cobre o caminho feliz do Supabase
- **WHEN** todos os cenários de um `.test.ts` de função com regra de negócio mockam o client do Supabase para sempre retornar sucesso, sem nenhum cenário de dado inválido, ausente ou de borda que devesse ser rejeitado pela regra de negócio
- **THEN** a skill `qualidade-vibe-coding` sinaliza a lacuna e pede pelo menos um cenário adicional que exercite a rejeição

### Requirement: Releitura de schema real antes de migration ou query nova
Uma sessão de agente que for escrever uma migration ou uma query contra uma tabela existente SHALL confirmar a estrutura real e atual dessa tabela (via `docs/database.md` marcado como confirmado, ou `supabase db query --linked` direto) imediatamente antes de escrever o SQL — não a partir de memória de sessão anterior ou de suposição de nome de campo.

#### Scenario: Migration escrita sem releitura do schema
- **WHEN** uma sessão escreve uma migration referenciando uma coluna ou tabela sem ter confirmado sua existência/nome exato na fonte de verdade atual
- **THEN** a skill `qualidade-vibe-coding` exige a confirmação antes de aplicar a migration

#### Scenario: Nome de campo divergente do assumido
- **WHEN** a confirmação do schema real revela que o nome de um campo ou tabela é diferente do que a sessão assumia (por memória, por documento inferido não confirmado, ou por suposição)
- **THEN** a sessão para e usa o nome real, sem seguir em frente com o nome suposto
