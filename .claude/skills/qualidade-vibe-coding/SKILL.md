---
name: qualidade-vibe-coding
description: Checklists de processo contra 4 riscos de qualidade específicos de código vibe-coded — incoerência arquitetural entre sessões, duplicação de trabalho em checkout compartilhado, teste com over-mocking, drift de schema. Use ao implementar regra de negócio nova, escrever/alterar teste de lógica de negócio, escrever migration ou query nova, ou operar (commit/troca de branch) no checkout primário fora de worktree.
---

# Qualidade em código vibe-coded — Industria24h

Origem: `openspec/changes/qualidade-codigo-vibe-coding/` (capability `governanca-qualidade-vibe-coding`), complementar ao `docs/prds/025-auditoria-seguranca-vibe-coding.md` (que cobre segurança, não qualidade). Estes quatro riscos não são vulnerabilidade explorável por atacante — são erosão silenciosa de correção/coerência causada pelo próprio processo de gerar código via agente de IA.

## 1. Regra de negócio nova — checar módulo antes de implementar

Antes de escrever uma função de preço, coletiva, comissão, repasse, disputa, frete ou equivalente:

- Identificar o módulo de domínio em `CODEOWNERS` (`catalogo-compra`, `seller`, `afiliado`, `logistica-parceiro`, `admin-plataforma`, `pagamentos-financeiro`).
- Buscar (grep/leitura) se a mesma regra já existe em `src/lib/<modulo>/` ou em módulo vizinho — o repo já teve regra de negócio duplicada em módulos diferentes por sessão nova não checar isso.
- Achou implementação equivalente em outro lugar? Parar e relatar ao usuário (reusar / migrar / justificar a duplicação) — nunca criar uma segunda implementação silenciosamente.

## 2. Checkout compartilhado — checar atividade concorrente antes de commitar/trocar branch

Vale para a raiz do repo (fora de `.claude/worktrees` e de um `web-*` isolado), onde sessões concorrentes já colidiram trocando branch (ver `feedback-git-checkout-primario-compartilhado` na memória do operador; aconteceu de novo em 24/08 na criação do PRD 025 e desta própria change).

- Antes de commitar, trocar de branch, ou dar push: rodar `git reflog -5` e `git status --short` e olhar se há commit de outra sessão nos últimos minutos na mesma branch.
- Encontrou atividade concorrente? Avisar o usuário antes de commitar. Nunca rodar `git reset --hard`, `git checkout --force` ou qualquer operação destrutiva que possa descartar o trabalho da outra sessão — só adicionar/commitar o que é seu.
- Se `git status` mostrar arquivo modificado que não é seu (ex.: `src/app/checkout/actions.ts` alterado por outra sessão), não fazer `git checkout -b` nem qualquer troca de branch que exija descartar essas mudanças — ficar na branch atual.

## 3. Teste de regra de negócio — não mockar a própria unidade testada

O `.test.ts` companheiro obrigatório para função nova em `src/lib/*.ts` com regra de negócio (skill `tdd-red-green-refactor`) só conta como cobertura real se:

- **Não mocka a própria função sob teste** — mock/stub que substitui a implementação real e sempre retorna o valor esperado dá falso verde.
- **Cobre pelo menos um cenário de rejeição**, não só o caminho feliz do Supabase — se todo cenário mocka o client do Supabase para sempre retornar sucesso, a regra de negócio real (validação, cálculo, checagem de permissão) nunca é exercitada.
- Candidatos com maior probabilidade de ter esse padrão hoje: `repasses.ts` e `preco-faixa.ts` (funções com incidente real já registrado — comissão sem indicação, faixa de desconto errada).

## 4. Migration ou query nova — reler o schema real antes de escrever

Reforça a regra já existente no `CLAUDE.md` do repo ("nunca inventar schema") com um passo concreto, obrigatório, imediatamente antes de escrever o SQL:

- Confirmar a estrutura real e atual da tabela via `docs/database.md` (só a parte marcada como **confirmada**, nunca um rascunho inferido) ou direto via `supabase db query --linked` — nunca a partir de memória de sessão anterior ou suposição de nome de campo.
- `database.types.ts` trunca silenciosamente se `supabase generate typescript types` rodar sem token — não confiar nele sem conferir o diff depois de regenerar.
- Nome de campo/tabela divergente do que a sessão assumia? Parar e usar o nome real — não seguir em frente com o nome suposto.
