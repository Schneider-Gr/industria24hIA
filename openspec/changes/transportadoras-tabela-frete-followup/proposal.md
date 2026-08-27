## Why

O PR #441 (mergeado 26/08/2026) entregou o núcleo do módulo de transportadoras (schema `transportadora_faixas_frete`, RPC `cotar_frete_tabela`, upload CSV, painéis admin/seller, fallback pro `%`), mas fechou com 5 lacunas registradas em `tasks.md` da change `transportadoras-tabela-frete-upload` e confirmadas com o dono em 27/08/2026: sem preview antes do import, sem tela de gestão de faixas, sem suporte a XLSX, sem verificação via navegador real, e sem peso real do carrinho chegando no cálculo de frete. Esta change fecha as 5.

## What Changes

1. **Preview antes de confirmar o import** (upload 2, tabela de frete): as actions `importarTabelaFrete`/`importarTabelaFreteSeller` passam a ter duas etapas — `pré-visualizar` (roda o parser, devolve as faixas candidatas e os bloqueios, não grava nada) e `confirmar` (recebe as faixas já revisadas e grava). UI ganha uma tela intermediária de revisão.
2. **View de gestão de faixas por transportadora** no admin (`/admin/transportadoras/[id]`): lista as faixas de `transportadora_faixas_frete` daquela transportadora (globais e, quando aplicável, overrides de loja visíveis só para leitura), com ação de desativar faixa individual — reaproveita `ativo` já existente na tabela, sem migration nova.
3. **Suporte a XLSX no upload**, revertendo a decisão de v1 de aceitar só CSV. A lib `xlsx` do npm segue travada com 2 CVEs altos sem fix (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) — a abordagem aqui é parsear o `.xlsx` no browser via `DecompressionStream`/`XMLParser` nativo do runtime (o mesmo método stdlib usado nesta sessão para inspecionar a planilha modelo do usuário, só que em TypeScript) **em vez de** instalar uma lib de terceiros, evitando reintroduzir a superfície vulnerável perto do checkout. Import size mínimo (zip + XML), sem parser de fórmulas/estilos.
4. **Verificação end-to-end via browser real**, num ambiente que realmente autentica (dev local ou uma conta de teste válida na preview — a tentativa anterior falhou por a preview não ter a mesma base de usuários de produção). Cobre: subir CSV, subir XLSX, ver preview, confirmar, ver faixa na tela de gestão, desativar faixa.
5. **Peso real do carrinho chegando no cálculo de frete**: o carrinho já tem os itens e quantidades; hoje esse peso nunca chega em `POST /api/checkout/cotar-frete` (o campo `peso_kg` existe na rota desde o PR #441, mas nada no client o preenche, e a maioria dos produtos não tem peso confiável — `docs/prd/fluxo-frete-completo.md` já registra 89/358). Este item soma `produtos.peso` (campo real, `numeric | null`, confirmado em `database.types.ts`) × quantidade dos itens do carrinho, com fallback documentado (placeholder 0 quando nulo, mesmo padrão já usado na rota) — não expande o cadastro de peso de produto, que é outro problema (dado ausente, não lógica ausente).

## Capabilities

### New Capabilities
- `admin-transportadoras/preview-import`: fluxo de duas etapas (pré-visualizar → confirmar) para o upload 2, incluindo suporte a XLSX (itens 1 e 3). Estende o comportamento de `admin-transportadoras/tabela-frete` (arquivada em `openspec/specs/`) sem substituir seus requisitos existentes.
- `admin-transportadoras/gestao-faixas`: tela de listagem/desativação de faixas por transportadora (item 2).
- `checkout/frete-peso-real`: soma do peso real dos itens do carrinho no payload de cotação de frete (item 5).

Item 4 (verificação via browser) não é uma capability nova — é um critério de aceite/tarefa de QA que cobre as demais, registrado em `tasks.md`.

## Impact

- `src/app/(admin)/admin/transportadoras/actions.ts`, `src/app/(seller)/seller/transportadoras/actions.ts`: novas actions de preview.
- `src/lib/transportadoras/parser-tabela-frete.ts`: sem mudança de contrato (já devolve corrigidas/bloqueantes — a UI é que passa a exibir antes de gravar).
- `src/lib/transportadoras/xlsx.ts` (novo): parser XLSX via `DecompressionStream` + `DOMParser`/regex XML mínimo, sem dependência nova.
- `src/app/(admin)/admin/transportadoras/[id]/page.tsx` (novo): gestão de faixas.
- `src/app/api/checkout/cotar-frete/route.ts`, `src/app/checkout/page.tsx`/`actions.ts`: soma de peso do carrinho.
- Nenhuma migration nova prevista (reaproveita `transportadora_faixas_frete.ativo`); reavaliar durante a task 2 se a view de gestão precisar de índice adicional.
