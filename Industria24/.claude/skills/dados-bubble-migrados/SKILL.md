---
name: dados-bubble-migrados
description: Cicatrizes dos dados migrados do Bubble no banco do Industria24h — linhas órfãs, NULLs esperados, registros legados. Use SEMPRE antes de declarar um dado de produção como bug, e ao escrever query/relatório que toque dados anteriores ao rebuild.
---

# Dados Migrados do Bubble — Industria24h

O banco de produção (`tiwdqgyeyvceaiqqwitc`) contém dados importados do Bubble legado. **Anomalia em dado antigo é provavelmente cicatriz de migração, não bug do código novo.** Verificar aqui antes de abrir investigação.

## Cicatrizes conhecidas (verificadas, não re-investigar)

- **`venda_futura_id` NULL em linhas antigas:** 8/9 linhas órfãs são migração Bubble; 1 é compra normal de estoque corrente. Cadeia código+RPC do checkout está íntegra (trace completo 22/07). NÃO é bug.
- **Lojas "(sem nome)":** resolvidas via SQL Editor; a causa (loja nasce Ativa sem onboarding) segue no código — lojas novas sem nome = bug atual; antigas = já limpo.
- **Categorias duplicadas:** deduplicadas via SQL em 14/07. Duplicata nova = regressão real.
- **Tabela `termos`:** nunca deveria existir; conteúdo vive em `paginas_cms`. Não recriar.
- **Histórico de migrations mente:** `migration list` parou em 0057 sob drift; após repair (22/07) hist_max=0067. Prova de existência = `to_regclass`.

## Regras para query/relatório

1. Antes de exibir número: validar coluna-fonte (preenchimento + cardinalidade), data-base (caixa vs competência) e unidade — dado Bubble pode ter semântica diferente do dado novo.
2. Filtrar ou segmentar por época quando a regra mudou no rebuild (ex.: aceite de termos só existe pós-0061).
3. Registro sem FK esperada → checar se é pré-migração antes de tratar como violação.
4. Nunca "corrigir" dado legado em massa sem aprovação do dono e teste `begin…rollback`.

## Atualizando esta skill

Nova cicatriz confirmada em investigação → adicionar aqui na mesma sessão, com data e veredito, para ninguém re-investigar.
