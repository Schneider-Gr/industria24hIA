## Why

O `npm run lint` rodado localmente analisava também diretórios que não são
código da aplicação: worktrees git de outras sessões (`web-worktrees/`,
`.claude/worktrees/`, cada uma com seu `.next` compilado), o virtualenv Python
do locust (`loadtest/.venv/`) e a saída do graphify (`graphify-out/`). O
resultado eram 7.304 erros e ~90 mil avisos, nenhum deles em código rastreado
da aplicação, e uma execução acima de 10 minutos — um sinal inútil, que o dev
aprende a ignorar.

O CI nunca viu esse ruído, porque roda sobre um checkout limpo onde esses
diretórios não existem. A divergência entre lint local e lint do CI é o
problema: quem roda local não consegue confiar no que vê antes de abrir o PR.

Faltava também um script de correção automática (`lint:fix`), e sobravam
quatro achados reais no código da aplicação, escondidos no meio do ruído.

## What Changes

- **Escopo do lint**: `eslint.config.mjs` passa a ignorar `web-worktrees/**`,
  `.claude/worktrees/**`, `loadtest/**` e `graphify-out/**`. Nenhum desses
  diretórios tem arquivo `.ts`/`.tsx`/`.js` rastreado no git — a verificação
  `git ls-files <dir>` retorna zero em todos.
- **Script `lint:fix`**: `eslint --fix` exposto no `package.json`, ao lado do
  `lint` já existente.
- **Quatro correções no código da aplicação**, todas de escopo local:
  - `TurnstileWidget.tsx`: `siteKey` incluída nas dependências do `useEffect`.
    Vem de `process.env.NEXT_PUBLIC_*`, é constante entre renders, então a
    inclusão não altera quando o efeito dispara.
  - `bot/ChatWidget.tsx`: removido o estado `conversaId`, que era escrito e
    nunca lido — o valor efetivamente usado é `conversaIdRef`. Elimina um
    re-render por resposta do bot.
  - `carrinho/carrinho.tsx`: removido um `eslint-disable-next-line` que não
    suprimia nada.
  - `seller/ProdutoForm.tsx`: removido o componente `Num`, sem nenhuma
    referência no arquivo.

## Impact

Lint da aplicação em **0 erros e 24 avisos**, sobre 496 arquivos.
`tsc --noEmit` limpo e 213 testes passando, antes e depois.

Os 24 avisos restantes ficam registrados como dívida consciente, não são
corrigidos aqui: 23 de `@next/next/no-img-element` (trocar `<img>` por
`next/image` muda carregamento e layout de imagem, exige avaliação visual
caso a caso) e 1 de `no-unused-vars` em `.claude/skills`, que não é código
da aplicação.

Nenhuma mudança de comportamento do site, de build ou de produção.
