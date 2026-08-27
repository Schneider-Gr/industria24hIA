## 1. Preview antes de confirmar o import (item 1)

- [x] 1.1 `pravisualizarTabelaFrete` (admin) e `pravisualizarTabelaFreteSeller` (seller): rodam `lerLinhasArquivo` + `parseTabelaFrete`, devolvem `{ corrigidas, erros }` sem gravar.
- [x] 1.2 `confirmarImportTabelaFrete`/`confirmarImportTabelaFreteSeller`: recebem as faixas revisadas e gravam.
- [x] 1.3 `UploadTabelaFrete` ganhou o estado de preview (lista de faixas com checkbox, botão "Confirmar import"), erros bloqueantes exibidos inline.
- [x] 1.4 Sem lógica nova fora de `lib/` — actions só orquestram `parseTabelaFrete`/`lerLinhasArquivo`, já testados.

## 2. View de gestão de faixas por transportadora (item 2)

- [x] 2.1 `/admin/transportadoras/[id]/page.tsx`: lista faixas (CEP, peso, valor, Global/nome da loja via join `lojas(nome)`), ordenada por CEP destino.
- [x] 2.2 `alternarFaixaFrete`: `update ativo`, reaproveita RLS existente, sem migration.
- [x] 2.3 Link "Ver faixas" adicionado em `/admin/transportadoras`. **Não implementado no seller** (o painel seller já lista transportadoras globais/próprias somente leitura; gestão de faixas fica só no admin nesta rodada — decisão de escopo, não bug).
- [x] 2.4 Sem paginação — volume real ainda não testado com centenas de linhas; `EmptyState`/scroll padrão do `Table` cobre o caso atual. Reavaliar se um import real trouxer volume alto.

## 3. Suporte a XLSX (item 3)

- [x] 3.1 `src/lib/transportadoras/zip-min.ts` (leitor ZIP mínimo, `DecompressionStream("deflate-raw")`) + `src/lib/transportadoras/xlsx.ts` (parser XML de `sheet1.xml`/`sharedStrings.xml`) + `.test.ts` — 3 testes.
- [x] 3.2 Só primeira aba (`xl/worksheets/sheet1.xml` fixo), sem fórmulas (célula com fórmula em vez de `<v>` literal vira string vazia).
- [x] 3.3 `lerLinhasArquivo` (`src/lib/transportadoras/arquivo.ts`) detecta `.csv`/`.xlsx` por extensão e roteia; `accept=".csv,.xlsx"` nos dois componentes de upload.
- [x] 3.4 `.test.ts` usa um gerador de `.xlsx` de teste (`xlsx-fixture-test-helper.ts`) que comprime de verdade via `CompressionStream("deflate-raw")` — exercita o mesmo caminho de descompressão que um arquivo real do Excel, cobrindo shared strings e valor bruto (os dois tipos de célula observados na planilha modelo real do usuário).

## 4. Verificação end-to-end via browser real (item 4)

- [x] 4.1 `npm run dev` local rodado com `.env.local` copiado do checkout principal (mesmo Supabase de produção) e login testado com `admin-teste-i24@example.com`.
- [ ] **BLOQUEADO — achado real, fora do escopo desta change**: a CSP do projeto (`next.config.ts`, `script-src` sem `'unsafe-eval'`) quebra a página inteira em `npm run dev` (React dev mode precisa de `eval()`; erro "eval() is not supported in this environment", overlay de erro do Next cobrindo a tela). Isso bloqueia **qualquer** verificação via browser em dev neste repositório, não só deste módulo — é uma lacuna da config de segurança introduzida pelas PRs de CSP (#448 e correlatas), não algo que deva ser corrigido dentro desta spec de transportadoras. Registrar como achado separado para o dono decidir (branch CSP dedicada de outra sessão já existe: `feat/csp-nonce-por-request`).
- [ ] 4.2/4.3/4.4 não executados por causa do bloqueio acima. Compensado por: 121 testes unitários (incluindo roundtrip ZIP/deflate real pro XLSX) + verificação SQL direta em produção da RPC `cotar_frete_tabela` com peso estreito (ver seção 5).

## 5. Peso real do carrinho no cálculo de frete (item 5)

- [x] 5.1 `src/lib/checkout/peso-carrinho.ts` + `.test.ts` (5 casos): `calcularPesoCarrinho`.
- [x] 5.2 `src/app/checkout/page.tsx`: a mesma consulta que já buscava `produtos.perecivel` (linha ~65) passou a trazer `produtos.peso` também; peso por loja calculado com `calcularPesoCarrinho` e enviado como `peso_kg` real em `POST /api/checkout/cotar-frete`.
- [x] 5.3 Confirmado via `supabase db query --linked` (`begin;...rollback;`): faixa `peso_min=1, peso_max=5` não é alcançável com `peso=0` (0 linhas) e é alcançável com `peso=2` (retorna o valor da faixa) — a RPC `cotar_frete_tabela` (0146/0148) já suportava isso, só faltava o peso real chegar do client.
- [x] 5.4 Cobrido em `peso-carrinho.test.ts`: todos com peso, misto, e sem peso nenhum (placeholder 0).

## 6. Verificação final

- [x] 6.1 `npm run test`: 121/121 passando (13 novos: 5 peso-carrinho + 3 xlsx + 3 arquivo + 2 pré-existentes reexecutados). `npx tsc --noEmit`: limpo. `npm run lint`: 0 erros (27 warnings pré-existentes, não relacionados).
- [x] 6.2 `openspec validate transportadoras-tabela-frete-followup --strict`: válido.
