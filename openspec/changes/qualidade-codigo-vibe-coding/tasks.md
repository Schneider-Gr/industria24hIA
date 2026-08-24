## 1. Skill

- [x] 1.1 Criar `.claude/skills/qualidade-vibe-coding/SKILL.md` com os 4 checklists desta spec, cada um com gatilho de contexto claro (regra de negócio nova / teste de lógica de negócio / migration-query / checkout compartilhado)
- [x] 1.2 Espelhar em `web/.claude/skills/qualidade-vibe-coding/SKILL.md`, seguindo a convenção das outras 45+ skills do projeto
- [x] 1.3 Referenciar esta change a partir da seção 3 (itens 5-8) de `docs/prds/025-auditoria-seguranca-vibe-coding.md`

## 2. Validação de que os checklists são acionáveis (não apenas princípio)

- [x] 2.1 Aplicar o checklist de módulo (R1) retroativamente em `preco-faixa.ts`/`repasses.ts`: buscar se alguma regra equivalente já existe duplicada em outro módulo — primeiro teste real do checklist. Nenhuma duplicação real encontrada (`carrinho.tsx` chama `precoFaixa` corretamente; a leitura de `min_qtd` em `produto/[id]/page.tsx` é regra de compra coletiva, não desconto progressivo).
- [x] 2.2 Aplicar o checklist de teste (R3) retroativamente nos `.test.ts` de `repasses.ts` e `preco-faixa.ts` (funções com incidente real já registrado) — checar se mockam a própria função ou só cobrem caminho feliz. `preco-faixa.test.ts` passa (função pura, cobre fronteiras/vencimento/inativo). `repasses.ts` não tem `.test.ts` nenhum — achado virou Issue #377 (fora de escopo corrigir aqui, conforme 3.1).
- [ ] 2.3 Aplicar o checklist de schema (R4) na próxima migration criada após esta change, como primeiro uso real

## 3. Fora do escopo desta change

- [ ] 3.1 Nenhuma correção de código a partir dos achados de 2.1/2.2 — se a validação encontrar duplicação real ou teste inválido, isso vira Issue própria, não é corrigido aqui
- [ ] 3.2 Automação/enforcement técnico dos checklists (ex.: hook de pre-commit que bloqueia) — fica para decisão futura se a disciplina manual não for suficiente
