# CLAUDE.md — Regras do Vault (Segundo Cérebro)

Leia este arquivo SEMPRE antes de criar ou editar qualquer nota neste vault.

## O que é este vault
Segundo cérebro em markdown local. A conversa é a interface; as notas são o produto.
Toda resposta valiosa vira nota conectada. Não é RAG: a recuperação é o Claude lendo o vault.

## Estrutura (onde cada nota mora)
- `00 Inbox/` — captura bruta, a processar. Nada fica aqui permanentemente.
- `01 Projetos/` — projetos com `status` (ideia → pesquisa → producao → publicado).
- `02 Pesquisas/` — uma nota por tema/ferramenta pesquisada.
- `03 Roadmaps/` — planejamento por data.
- `04 Referências/` — fontes externas (artigo, vídeo, livro, citação).
- `05 Journal/` — notas diárias `YYYY-MM-DD.md`.
- `99 Templates/` — modelos por tipo (não editar como nota).
- `Canvas/` — mapas visuais `.canvas`.

## Frontmatter obrigatório (YAML plano)
```yaml
---
title: Nome da Nota
type: projeto        # projeto | pesquisa | referencia | daily | roteiro
status: ideia        # só para type: projeto
tags: [tema, plataforma]
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```
Regras: YAML plano (sem aninhar) · datas reais no formato `YYYY-MM-DD` · atualizar `updated` ao editar.

## Status válidos (projetos)
`ideia` · `pesquisa` · `producao` · `publicado`. Nada fora disso.

## Convenção de nomes
Títulos legíveis com espaços nos arquivos visíveis (`Meu Vídeo.md`). Tags em **minúsculas**
e com hífen (`#claude-code`, nunca `#ClaudeCode`). Vocabulário de tags consistente — antes de
criar uma tag nova, verifique se já existe variante.

## Wikilinks (o que mantém o grafo vivo)
- Conecte cada nota nova a pelo menos uma existente, quando fizer sentido.
- Use `[[Nota]]` (por nome) ou `[[01 Projetos/Nota]]` (por caminho).
- Pesquisa que embasa um projeto deve linká-lo nos dois sentidos.
- Conceitos relacionados sempre como `[[wikilink]]`, nunca texto solto.

## Antes de escrever
1. Ler este CLAUDE.md.
2. `glob`/listar o vault para reaproveitar wikilinks e tags existentes.
3. Usar o template certo de `99 Templates/` — não inventar layout.

## Segurança
- Nunca registrar senhas, tokens, chaves de API ou credenciais nas notas.
- Conteúdo sensível (folha, dados pessoais, PII) fica fora da base de conhecimento.
- Confirmar antes de mover/apagar arquivos do Inbox ou aplicar correções em massa.
