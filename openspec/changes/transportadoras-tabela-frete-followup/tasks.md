## 1. Preview antes de confirmar o import (item 1)

- [ ] 1.1 Nova action `pravisualizarTabelaFrete(formData)` (admin) e equivalente seller: roda `parseCsvLinhas`/`parseTabelaFrete` (e o novo parser XLSX, task 3), devolve `{ corrigidas, bloqueantes }` sem gravar nada.
- [ ] 1.2 Nova action `confirmarImportTabelaFrete(transportadoraId, faixas)` (admin) e equivalente seller: recebe as faixas já revisadas (o client pode ter removido alguma da lista do preview) e grava, mesma lógica de `importarTabelaFrete` atual menos o parsing.
- [ ] 1.3 UI: `UploadTabelaFrete` ganha estado intermediário — depois de escolher o arquivo, mostra tabela de preview (faixa CEP/peso/valor) com checkbox por linha e um botão "Confirmar import"; erro bloqueante aparece inline por linha, não só no relatório final.
- [ ] 1.4 `.test.ts` das duas novas actions não é necessário (só orquestram funções já testadas em `lib/`), mas testar qualquer lógica nova de merge/seleção de linhas que não esteja em `parser-tabela-frete.ts` — extrair para `lib/transportadoras/` se houver algo não trivial.

## 2. View de gestão de faixas por transportadora (item 2)

- [ ] 2.1 Nova rota `/admin/transportadoras/[id]/page.tsx`: lista faixas de `transportadora_faixas_frete` daquela transportadora (`cep_destino_inicial/final`, `peso_min/max`, `valor`, `loja_id` — exibindo "Global" ou o nome da loja), ordenada por CEP.
- [ ] 2.2 Action `alternarFaixaFrete(id, ativo)`: `update ativo` — reaproveita RLS existente (`transportadora_faixas_frete_admin_all`/`_seller_own`), sem migration nova.
- [ ] 2.3 Link "Ver faixas" na listagem de `/admin/transportadoras` (linha da tabela) e equivalente em `/seller/transportadoras`.
- [ ] 2.4 Se o volume de faixas por transportadora for alto (planilha real pode ter centenas de linhas), paginar — decidir threshold durante a implementação com base no volume real de teste.

## 3. Suporte a XLSX (item 3)

- [ ] 3.1 `src/lib/transportadoras/xlsx.ts` + `.test.ts`: parser mínimo via `DecompressionStream("deflate-raw")` (nativo, sem dependência) para descompactar as entradas do zip (`xl/worksheets/sheet1.xml`, `xl/sharedStrings.xml`) e um parser XML mínimo (regex ou `DOMParser` quando disponível) para extrair `Record<string,string>[]` — mesmo formato de saída de `parseCsvLinhas`, para os parsers de negócio (`parser-lista.ts`/`parser-tabela-frete.ts`) não mudarem.
- [ ] 3.2 Escopo explícito: só a primeira planilha (`sheet1.xml`), só valor de texto/número (sem fórmula, sem formatação, sem múltiplas abas) — documentar a limitação na UI ("primeira aba, sem fórmulas").
- [ ] 3.3 `UploadListaTransportadoras`/`UploadTabelaFrete`: aceitar `.csv,.xlsx` no `accept` do input, detectar extensão e rotear pro parser certo antes de chamar a action de preview.
- [ ] 3.4 `.test.ts` cobrindo um `.xlsx` real gerado a partir da planilha modelo do usuário (fixture de teste, não a lib de terceiros) — reaproveitar a extração feita nesta sessão (zipfile + ElementTree em Python) como referência do formato esperado, mas a implementação de produção é TypeScript.

## 4. Verificação end-to-end via browser real (item 4)

- [ ] 4.1 Rodar `npm run dev` local (não a preview do Vercel — falhou por divergência de ambiente na tentativa anterior) com `.env.local` apontando pro Supabase de produção (mesmo padrão já usado pelas outras verificações desta sessão) e a conta de teste `admin-teste-i24@example.com` (senha em `ContasTeste.tsx`).
- [ ] 4.2 Fluxo completo: login admin → `/admin/transportadoras` → subir CSV de teste → ver preview → confirmar → ver faixa em `/admin/transportadoras/[id]` → desativar faixa → confirmar que ela some do cálculo (repetir a verificação SQL do PR #441, agora validando que a UI reflete o estado).
- [ ] 4.3 Repetir subindo um `.xlsx` de teste (gerado a partir da planilha modelo do usuário) em vez de CSV, confirmar mesmo resultado.
- [ ] 4.4 Repetir no painel seller (`/seller/transportadoras`): subir tabela própria, sobrescrever faixa de transportadora global, confirmar prioridade no preview antes de qualquer verificação de checkout.

## 5. Peso real do carrinho no cálculo de frete (item 5)

- [ ] 5.1 `src/lib/checkout/peso-carrinho.ts` + `.test.ts`: função pura `calcularPesoCarrinho(itens, pesosPorProduto)` — soma `peso × quantidade` por item, produto sem `peso` cadastrado conta como 0 (mesmo placeholder já documentado, não um valor inventado).
- [ ] 5.2 `src/app/checkout/page.tsx`: buscar `produtos.peso` dos produtos do carrinho (mesmo padrão já usado para detectar item perecível, linha ~65 do arquivo atual) e passar `peso_kg` real (por loja, já que o frete é cotado por loja) no `POST /api/checkout/cotar-frete`.
- [ ] 5.3 Confirmar que `cotar_frete_tabela` (RPC já existente, sem mudança) recebe o peso real e que uma faixa de peso mais estreita que 0 (ex. `peso_min=1, peso_max=5`) passa a ser alcançável — hoje só é alcançável a faixa que inclui 0.
- [ ] 5.4 `.test.ts` cobrindo: carrinho com todos os produtos com peso cadastrado, carrinho misto (alguns sem peso), carrinho totalmente sem peso (mantém o comportamento atual, placeholder 0).

## 6. Verificação final

- [ ] 6.1 `npm run test`, `npx tsc --noEmit`, `npm run lint` limpos.
- [ ] 6.2 `openspec validate transportadoras-tabela-frete-followup --strict`.
