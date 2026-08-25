# PRD 028 — Auditoria periódica de integridade de dependências (npm)

## Contexto

Entre fevereiro e março de 2026 um grupo de atacantes comprometeu o Trivy, o
Checkmarx e, por consequência, o LiteLLM através de uma cadeia de supply
chain attack em GitHub Actions: exploraram `pull_request_target` mal
configurado para roubar um PAT, usaram o token para forçar (`--force`)
tags de release a apontarem para commits maliciosos, e por fim publicaram
pacotes maliciosos **diretamente no PyPI sem que o código correspondente
existisse no repositório público** — quem auditasse o GitHub via code
review nunca veria o payload real instalado pelos usuários.

Este projeto não publica pacotes próprios em nenhum registry (não há
exposição direta a esse vetor específico), mas consome centenas de
dependências de terceiros via npm (`package.json`/`package-lock.json`).
O mesmo padrão de ataque — publicar no registry um tarball que diverge do
código-fonte auditável — é genérico e já afetou pacotes populares (ex.:
Axios, no mesmo ciclo de ataques, por outro grupo). `npm audit` (já rodado
no CI, ver `.github/workflows/ci.yml`) cobre CVEs conhecidas cadastradas
em bases de vulnerabilidade, mas não detecta divergência entre o tarball
publicado e o repositório declarado quando ainda não há CVE registrada.

Mitigações já aplicadas neste PRD como pré-requisito (achado do vídeo
"Repliquei um ataque real no GitHub Actions", ver memória
`reference-ataque-supplychain-trivy-litellm-pullrequesttarget`):

- Nenhum workflow deste repositório usa `pull_request_target` — confirmado
  por grep em `.github/workflows/` em 2026-08-25. Não há ação corretiva
  pendente neste ponto; documentar aqui para o caso de algum workflow
  futuro introduzir o trigger sem essa checagem.
- Todas as actions de terceiros em `.github/workflows/*.yml` foram
  re-pinadas do formato de tag mutável (`@v4`, `@v2`, `@v1`) para o hash de
  commit correspondente (`@<sha40> # v4`), eliminando o vetor de "force
  push da tag para um commit malicioso" usado contra a Trivy Action.

## Objetivo

Detectar, em cadência recorrente, quando uma dependência direta do
`package.json` publicada no npm diverge do código-fonte do repositório
declarado como origem — sinal de comprometimento do pipeline de
publicação do mantenedor upstream, independente de já existir CVE
cadastrada.

## Fora de escopo

- Auditoria de dependências transitivas (profundidade > 1) — volume alto
  demais para revisão manual; cobertura via `npm audit`/Dependabot
  continua sendo a defesa de primeira linha para essas.
- Publicação de pacotes próprios (não se aplica a este repositório hoje).
- Verificação de assinatura/proveniência criptográfica (`npm audit
  signatures`, Sigstore) — desejável como evolução futura, não incluída
  nesta primeira versão por depender de suporte do publisher upstream,
  que a maioria dos pacotes usados ainda não tem.

## Mecanismo

Workflow agendado (`schedule`, sem trigger em PR/push — roda fora do
caminho crítico de deploy) que, para cada dependência **direta** de
`dependencies` no `package.json`:

1. Resolve o `repository.url` declarado no `package.json` publicado no
   registry npm (`npm view <pkg> repository.url`).
2. Baixa o tarball publicado (`npm pack <pkg>@<versão-do-lockfile>`) e o
   snapshot do repositório declarado na mesma tag/versão (quando o
   repositório for GitHub e a tag existir — nem todo mantenedor tagueia
   toda release, esse caso vira `sem-comparação` no relatório, não falha).
3. Compara a árvore de arquivos relevantes (excluindo `node_modules`,
   `.git`, artefatos de build declarados em `.npmignore`/`files` do
   `package.json`) por hash de conteúdo.
4. Reporta divergências como achado, sem bloquear o merge de nada — é
   observabilidade, não gate. Abre (ou atualiza) uma Issue única
   `security: divergência tarball×repo` com a lista de pacotes
   divergentes, para triagem manual.

Frequência: semanal, alinhada ao Dependabot (evita ruído de rodar a cada
push) — `schedule: cron: '0 8 * * 1'` (segunda-feira, 08h UTC).

## Critério de aceite

- [ ] Workflow `.github/workflows/audit-dependencia-integridade.yml`
      criado, com `schedule` semanal e `workflow_dispatch` para rodar sob
      demanda.
- [ ] Script (`scripts/audit-dependency-integrity.*`) implementa os 4
      passos do mecanismo acima para as dependências diretas de
      `dependencies` (não `devDependencies`, para manter o escopo
      inicial gerenciável).
- [ ] Pacotes sem tag/release correspondente no repositório, ou cujo
      `repository.url` não resolve para GitHub, entram no relatório como
      `sem-comparação` — não geram falso-positivo de "divergente".
- [ ] Divergência real abre/atualiza uma Issue via `gh issue create`/`gh
      issue edit`, nunca falha o job (evita alarme silencioso sendo
      ignorado por virar rotina de CI vermelho).
- [ ] Todas as actions usadas neste novo workflow já nascem pinadas por
      hash de commit (não por tag), seguindo a mitigação aplicada nesta
      mesma PRD para os workflows existentes.
- [ ] README ou comentário no workflow explica como triar um achado
      (verificar changelog do pacote, contato com o mantenedor, considerar
      `npm audit signatures` como segundo sinal antes de agir).

## Não fazer

- Não pinar `package-lock.json` a hashes de commit do próprio pacote —
  isso é escopo do npm/registry, não deste PRD.
- Não bloquear CI/deploy quando o script encontrar divergência: é sinal
  para triagem humana, falso-positivo é caro (mantenedor legítimo que
  publica sem tag, monorepo com paths diferentes etc.) e um gate
  bloqueante nesse cenário seria descartado rapidamente pela equipe.
