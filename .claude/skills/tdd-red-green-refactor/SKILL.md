---
name: tdd-red-green-refactor
description: Ciclo Red-Green-Refactor obrigatório com Vitest para código novo em src/lib/*.ts do Industria24h. Use SEMPRE antes de implementar uma função nova de regra de negócio (preço, coletiva, comissão, repasse, disputa, frete), ou quando o usuário pedir TDD/testes/Vitest.
---

# TDD (Red-Green-Refactor) — Industria24h

Vitest instalado em `web/` (`vitest.config.ts`, escopo `src/**/*.test.ts`).
Ver detalhe completo na seção "### Testes — Red, Green, Refactor" de
`web/CLAUDE.md` — este arquivo é o resumo operacional.

## Quando é obrigatório

Toda função nova em `src/lib/*.ts` que carregue regra de negócio (preço,
coletiva, comissão, repasse, disputa, frete) nasce com um `.test.ts`
companheiro escrito **antes** da implementação. Escopo é código novo — não
é retrofit obrigatório de `lib/` existente sem teste (mas bem-vindo ao
tocar um arquivo por outro motivo).

## O ciclo

1. **Red** — escrever o teste que falha porque a função não existe ou está
   incompleta. Confirmar vermelho: `npx vitest run <arquivo>`.
2. **Green** — implementar o mínimo para o teste passar.
3. **Refactor** — só então refatorar, rodando o teste a cada mudança para
   garantir que continua verde.

## Comandos

```bash
npm run test        # roda tudo uma vez — é o que o job "test" do CI executa
npm run test:watch  # modo watch, usar durante o ciclo red/green
```

## Convenção de sintaxe

Os `.test.ts` existentes usam `node:assert/strict` dentro de um wrapper
`test("nome", () => { ... })` do Vitest — não `describe/it` (Vitest só
exige que exista uma suíte registrada, senão falha com "No test suite
found"). Testes novos podem seguir o mesmo padrão ou usar
`describe/it/expect`, à escolha.

## Fora de escopo

- Rotas de API (`src/app/api/**/route.ts`) e Server Actions que só chamam
  lógica já testada em `lib/` não precisam de teste próprio. Se tiverem
  validação/orquestração não trivial embutida, extrair para `lib/`
  primeiro (já é a convenção do projeto) e testar lá.
- Migrations SQL ficam fora do Vitest — seguem o fluxo manual de
  `supabase db query --linked` (ver skill `migrations-industria24`).

## CI

O job `test` em `.github/workflows/ci.yml` roda `npm run test` e quebra o
PR se algum teste falhar (junto com `secret-scan`, `lint-build`,
`migrations-lint`).
