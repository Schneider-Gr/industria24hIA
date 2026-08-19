## 1. CODEOWNERS por domínio (concluído)

- [x] 1.1 Levantar arquitetura atual (rotas, acoplamento a Supabase, convenção declarada vs. praticada) — brainstorm de arquitetura, 2026-08-19
- [x] 1.2 Definir os 6 módulos de domínio + bloco de plataforma compartilhada
- [x] 1.3 Criar `.github/CODEOWNERS` mapeado pelos 6 módulos
- [x] 1.4 Abrir PR referenciando a motivação e a limitação de conta compartilhada — PR #323 (`Schneider-Gr/industria24hIA`)

## 2. Documentação formal (PRD, spec, change)

- [x] 2.1 Escrever PRD 018 (`docs/prds/018-monolito-modular-por-dominio.md`)
- [x] 2.2 Criar esta OpenSpec change (`monolito-modular-industria24`) com as 3 specs derivadas
- [x] 2.3 Abrir Issue de acompanhamento no GitHub referenciando PRD 018 e PR #323 — Issue #324
- [x] 2.4 Atualizar `CLAUDE.md` do projeto com a convenção `src/lib/<modulo>/` e o processo strangler fig — PR #325
- [x] 2.5 Criar `docs/trd.md` documentando a arquitetura-alvo — PR #325
- [x] 2.6 Escrever PRD 019 (`docs/prds/019-indices-fk-triagem-e-gatilhos-escala.md`) — PR #325
- [x] 2.7 Aplicar Milestone 1 do PRD 019 (12 índices de FK de alto uso) — migration `0132_indices_fk_alta_frequencia.sql`, testada em `begin; ... rollback;` e confirmada via `pg_indexes`; Issue #326

## 3. Convenção aplicada a PR novo (contínuo, sem prazo)

- [ ] 3.1 Validar em 1-2 PRs reais (próxima feature/bug que tocar `src/lib/`) que a convenção `src/lib/<modulo>/` + `.test.ts` companheiro está sendo seguida
- [ ] 3.2 Ajustar `CLAUDE.md`/spec se a convenção se mostrar impraticável em algum módulo real

## 4. Migrations por módulo

- [ ] 4.1 Definir faixas de numeração por módulo quando o segundo dev começar a commitar migrations (sem números fixados nesta change — ver `arquitetura-migrations-por-modulo/spec.md`)
- [ ] 4.2 Documentar a faixa escolhida no `CLAUDE.md`, junto da regra de checagem de colisão já existente

## 5. Fechamento

- [ ] 5.1 Confirmar que PRD 018 tem todos os checklists de milestone marcados
- [ ] 5.2 Rodar `openspec archive monolito-modular-industria24` após Milestone 1 e 2 do PRD 018 concluídos, consolidando as specs em `openspec/specs/`
