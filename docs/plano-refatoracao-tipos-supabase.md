# Plano — eliminar os `any` de `database.types.ts` desatualizado

## O que motivou este plano

"Refatorar o projeto inteiro" não é executável sem alvo. Investiguei o que
existe de dívida técnica real e documentada no código (comentários
`eslint-disable ... no-explicit-any` e `// ponytail:`) para achar um alvo
concreto em vez de reescrever código que já funciona.

**Achado:** existem exatamente **37 usos de `any`** em `src/`, todos com
comentário de justificativa, e **100% deles citam a mesma causa raiz**:
`src/lib/supabase/database.types.ts` está desatualizado. Ele foi gerado pela
última vez em **30/07/2026** (commit `91030e46`) e não cobre tabelas/RPCs/
colunas criadas pelas migrations 0039 (parceiro logístico/corridas), 0040
(RPCs de corrida), 0042 (rotas), 0062 (RPC de termos), 0073/0074
(consolidação de carga), 0076–0080 (compra coletiva v2) e 0094 (carrinhos
abandonados) — ou seja, boa parte da segunda metade das 94 migrations do
projeto.

Isso não é código malfeito — é o tipo declarado como `any` porque a
ferramenta que deveria gerar o tipo certo (`supabase gen types typescript`)
não rodou de novo depois dessas migrations. É uma dívida real, com uma causa
única e um conserto mecânico.

**O que eu NÃO estou tratando como dívida:** os outros 19 comentários
`// ponytail:` no código (rate limit em memória, CSP adiada, ViaCEP sem
provedor pago, réplica pura de função SQL nos testes, etc.) são decisões
documentadas deliberadamente, não gambiarras esquecidas — várias já têm
plano próprio em `docs/plano-hardening-infra.md`. Refatorar essas seria ir
contra a convenção do próprio projeto de documentar trade-off consciente em
vez de esconder. Deixei de fora.

O typo `ASASS_API_KEY` (achado na revisão de código anterior) também fica de
fora deste plano — é um problema de configuração de env var, não de tipo, e
já está registrado separadamente.

---

## Passo 0 — pré-requisito (fora do meu alcance nesta sessão)

Preciso do **Supabase CLI autenticado** para regenerar o arquivo. Não tenho
esse acesso neste ambiente (`supabase` não está instalado no sandbox e eu
não tenho o token de acesso do projeto). Alguém com a CLI logada
(`supabase login`) precisa rodar, a partir de `Industria24/web/`:

```bash
supabase gen types typescript --project-id tiwdqgyeyvceaiqqwitc \
  > src/lib/supabase/database.types.ts
```

(o `project-id` é o mesmo `EXPECTED_REF` já usado em `scripts/import-bubble.mjs`
e em `supabase/.temp/project-ref`.)

Sem esse passo, nada do resto é executável — os outros passos partem do
arquivo já regenerado.

## Passo 1 — diff do arquivo gerado

Depois do `gen types`, olhar o diff do `database.types.ts` antes de tocar em
qualquer chamador: confirma que as tabelas/RPCs esperadas (0039, 0042,
0062/0073/0074, 0076–0080, 0094) realmente apareceram. Se alguma ainda faltar,
é sinal de que a migration correspondente não rodou no projeto linkado — para
e investiga antes de seguir (não assume, confirma).

## Passo 2 — remover os `any`, um arquivo por vez

37 pontos, agrupados por módulo pra revisar em lotes pequenos e testáveis
(rodar `npx tsc --noEmit` + `npm run lint` depois de cada lote, não só no
final):

**Lote A — parceiro logístico / corridas (migrations 0039/0040/0042), 12 pontos**
- `src/app/(admin)/admin/parceiros/actions.ts:14`
- `src/app/(admin)/admin/parceiros/page.tsx:21`
- `src/app/(afiliado)/afiliado/logistica/page.tsx:206,227`
- `src/app/(parceiro)/parceiro/GpsCheckin.tsx:21`
- `src/app/(parceiro)/parceiro/actions.ts:11`
- `src/app/(parceiro)/parceiro/cadastro/page.tsx:31`
- `src/app/(parceiro)/parceiro/page.tsx:71`
- `src/app/(seller)/seller/rotas/actions.ts:9`
- `src/app/(seller)/seller/rotas/page.tsx:8`
- `src/app/corridas/[id]/page.tsx:18`
- `src/app/corridas/actions.ts:9`
- `src/app/corridas/page.tsx:25`

**Lote B — leilão reverso (migration 0039), 3 pontos**
- `src/app/leilao/[id]/page.tsx:23`
- `src/app/leilao/actions.ts:9`
- `src/app/leilao/page.tsx:24`

**Lote C — compra coletiva v2 (migrations 0076–0080), 9 pontos**
- `src/app/(admin)/admin/coletivas/page.tsx:39`
- `src/app/(seller)/seller/coletivas/actions.ts:31,49,101`
- `src/app/(seller)/seller/coletivas/ia-actions.ts:36`
- `src/app/(seller)/seller/coletivas/page.tsx:58`
- `src/app/coletiva/[id]/page.tsx:93`
- `src/app/coletiva/actions.ts:39`
- `src/app/produto/[id]/[[...slug]]/page.tsx:121`
- `src/lib/agentes/coletiva-etapas.ts:40`

**Lote D — consolidação de carga / checkout (migrations 0062/0073/0074), 4 pontos**
- `src/app/(admin)/admin/lotes/actions.ts:18,36`
- `src/app/(admin)/admin/lotes/page.tsx:32`
- `src/app/checkout/actions.ts:141,182,199` (3 usos no mesmo arquivo)

**Lote E — carrinho abandonado (migration 0094), 3 pontos**
- `src/app/api/carrinho/abandono/tick/route.ts:22,49`
- `src/app/api/carrinho/sync/route.ts:20`
- `src/app/checkout/actions.ts:228`

Para cada ponto: trocar `(supabase as any).from(...)` (ou variante) pelo
client tipado normal, apagar o comentário `eslint-disable-next-line`, e
deixar o TypeScript apontar qualquer incompatibilidade real de shape — é
esperado achar 1-2 lugares onde o tipo gerado revela um campo que o código
assumia errado (isso é o ganho do exercício, não um efeito colateral ruim).

## Passo 3 — checklist antes de considerar pronto

- [ ] `npx tsc --noEmit` limpo (sem os `any`)
- [ ] `npm run lint` limpo (sem sobrar `eslint-disable` órfão)
- [ ] `npm run build` passa
- [ ] Os 6 arquivos `*.test.ts` continuam passando (`node --experimental-strip-types <arquivo>`)
- [ ] Nenhum `eslint-disable ... no-explicit-any` sobrando em `src/` (`grep -rn` deve voltar vazio, exceto se aparecer um caso genuinamente novo depois do regen — aí documentar por quê)

## Por que fazer em lotes e não tudo de uma vez

Compra coletiva e checkout mexem com dinheiro de verdade (rateio de
pedido, cobrança Asaas). Prefiro 5 PRs pequenos e revisáveis a um PR de 37
pontos onde um erro de shape em RPC financeira passa despercebido no meio do
volume.

---

**Não vou executar nada disso até você confirmar** — em particular, o Passo 0
depende de alguém rodar o `supabase gen types` com acesso à CLI, que eu não
tenho aqui. Se você já tem o arquivo regenerado, me manda que eu sigo direto
pros lotes.
