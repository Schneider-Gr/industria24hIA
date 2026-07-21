# Graph Report - gap-analysis  (2026-07-20)

## Corpus Check
- 233 files · ~174,198 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 18 nodes · 24 edges · 5 communities (1 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3fcd9b8a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_actions.ts|actions.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_aceite-termos.test.ts|aceite-termos.test.ts]]
- [[_COMMUNITY_salvarCadastroParceiro|salvarCadastroParceiro]]

## God Nodes (most connected - your core abstractions)
1. `db()` - 7 edges
2. `salvarCadastroParceiro()` - 4 edges
3. `alterarChavePixParceiro()` - 3 edges
4. `versaoTermosVigente()` - 2 edges
5. `aceitarCorrida()` - 2 edges
6. `darLanceCorrida()` - 2 edges
7. `atualizarStatusCorrida()` - 2 edges
8. `atualizarStatusRota()` - 2 edges
9. `Parceiro` - 1 edges
10. `Decisao` - 1 edges

## Surprising Connections (you probably didn't know these)
- `alterarChavePixParceiro()` --calls--> `db()`  [EXTRACTED]
  src/app/(parceiro)/parceiro/actions.ts → src/app/(parceiro)/parceiro/actions.ts  _Bridges community 0 → community 1_
- `salvarCadastroParceiro()` --calls--> `db()`  [EXTRACTED]
  src/app/(parceiro)/parceiro/actions.ts → src/app/(parceiro)/parceiro/actions.ts  _Bridges community 0 → community 4_

## Import Cycles
- None detected.

## Communities (5 total, 4 thin omitted)

### Community 0 - "actions.ts"
Cohesion: 0.60
Nodes (5): aceitarCorrida(), atualizarStatusCorrida(), atualizarStatusRota(), darLanceCorrida(), db()

## Knowledge Gaps
- **3 isolated node(s):** `Parceiro`, `Decisao`, `Parceiro`
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `db()` connect `actions.ts` to `page.tsx`, `salvarCadastroParceiro`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `salvarCadastroParceiro()` connect `salvarCadastroParceiro` to `actions.ts`, `page.tsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `alterarChavePixParceiro()` connect `page.tsx` to `actions.ts`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `Parceiro`, `Decisao`, `Parceiro` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._