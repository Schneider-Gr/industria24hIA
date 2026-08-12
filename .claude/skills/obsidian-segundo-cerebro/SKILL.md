---
name: obsidian-segundo-cerebro
description: >
  Transforma um vault do Obsidian em um "segundo cérebro" mantido pelo Claude — no estilo do
  vídeo do Matheus Battisti (Hora de Codar). Use SEMPRE que o usuário pedir para trabalhar com
  Obsidian, criar/organizar um vault, gerar notas em markdown com frontmatter e wikilinks corretos,
  montar a estrutura de pastas (Inbox, Projetos, Pesquisas, Roadmaps, Referências, Journal, Templates),
  criar o CLAUDE.md de regras do vault, ou rodar o "loop" de manutenção diária. Ativa para:
  "segundo cérebro", "second brain", "vault", "Obsidian", "nota diária / daily note",
  "processar inbox", "pesquisar e salvar nota", "gerar roteiro", "revisão semanal",
  "criar canvas", "notas órfãs", "wikilink", "frontmatter", "JSON Canvas".
---

# Obsidian — Segundo Cérebro

## Papel

Você constrói e mantém um vault Obsidian como segundo cérebro (metodologia do vídeo "Claude Code Turned My Obsidian into a Second Brain", Matheus Battisti). Você respeita rigorosamente os formatos do Obsidian — wikilinks `[[ ]]`, frontmatter YAML válido, tags minúsculas — porque arquivo que "parece markdown" mas quebra no Obsidian é pior que nenhum arquivo.

## Objetivo

Vault local, 100% markdown, onde cada nota nova nasce do template certo, linkada ao que já existe, e um loop de manutenção (daily → pesquisa → inbox → roteiro → revisão semanal) mantém o grafo vivo.

## Contexto deste usuário

Vault principal: `C:\Users\andre\ObsidianVault` (MCP Obsidian configurado, REST porta 27124 — memória `mcp-obsidian-setup`). Skills irmãs para formato: `obsidian-markdown` (sintaxe), `obsidian-bases` (.base), `json-canvas` (.canvas), `obsidian-cli` (operações). Skills oficiais do Kepano: https://github.com/kepano/obsidian-skills — recomendar se ausentes; na falta delas, as regras de formato abaixo bastam.

## Estrutura do vault (criar com 1 prompt)

Quando pedir "monte meu segundo cérebro", criar (adaptando nomes ao contexto do usuário):

```
Vault/
├── 00 Inbox/          # tudo que chega, ainda não processado
├── 01 Projetos/       # projetos com status (ideia → produção → publicado)
├── 02 Pesquisas/      # pesquisa de ferramentas/temas
├── 03 Roadmaps/       # planejamento por data
├── 04 Referências/    # fontes, livros, artigos
├── 05 Journal/        # daily notes
├── 99 Templates/      # templates por tipo de nota
├── Canvas/            # mapas visuais .canvas
└── CLAUDE.md          # regras do vault (base: reference/vault-CLAUDE.md desta skill)
```

Ao montar, gerar dados de exemplo (projetos em status diferentes, notas interlinkadas) para o Graph View já mostrar conexões.

## Regras de formato (obrigatórias)

Frontmatter YAML em toda nota:

```yaml
---
title: Nome da Nota
type: projeto        # projeto | pesquisa | referencia | daily | roteiro
status: ideia        # ideia | pesquisa | producao | publicado  (só p/ projetos)
tags: [tema, plataforma]
created: 2026-06-22
updated: 2026-06-22
---
```

Wikilinks: `[[01 Projetos/Meu Vídeo]]` ou `[[Meu Vídeo]]`. Tags minúsculas e consistentes (`#claude-code`, não `#ClaudeCode`). Templates em `templates/` desta skill: `projeto.md`, `pesquisa.md`, `referencia.md`, `daily.md`, `roteiro.md` — copiar e preencher, nunca inventar layout.

## O LOOP — fluxos sob demanda

### "gera minha daily"
1. Criar `05 Journal/YYYY-MM-DD.md` de `templates/daily.md`. 2. Puxar tarefas `- [ ]` não marcadas da daily anterior. 3. Listar projetos com status `producao`. 4. Linkar tudo.

### "pesquisa X e salva"
1. Pesquisar na web. 2. Salvar em `02 Pesquisas/<tema>.md` via template. 3. Conectar ao existente: wikilinks nos dois sentidos.

### "processa o inbox"
Para cada arquivo em `00 Inbox/`: extrair conteúdo → resumo limpo em markdown → tags + frontmatter → mover para a pasta certa → arquivar o original. Reportar o que foi processado e para onde.

### "gera o roteiro do projeto X"
Reunir todas as pesquisas linkadas ao projeto → esqueleto em `01 Projetos/<projeto>/roteiro.md` via template (gancho, desenvolvimento, conclusão, CTA).

### "faz a revisão semanal"
1. Notas órfãs (sem wikilink de entrada/saída). 2. Tags inconsistentes (variações, maiúsc., plural). 3. Conexões que deveriam existir. 4. Relatório → aplicar só as correções aprovadas.

## Canvas visual (JSON Canvas)

Gerar `.canvas` em `Canvas/`; cards coloridos por status (ideia=cinza, produção=amarelo, publicado=verde); arestas entre projetos de mesmo tema/tag. Estrutura mínima:

```json
{
  "nodes": [
    {"id":"n1","type":"file","file":"01 Projetos/Meu Vídeo.md","x":0,"y":0,"width":260,"height":120,"color":"4"},
    {"id":"n2","type":"text","text":"Tema: Claude Code","x":320,"y":0,"width":220,"height":80}
  ],
  "edges": [{"id":"e1","fromNode":"n1","toNode":"n2"}]
}
```

Cores: `"1"` vermelho, `"2"` laranja, `"3"` amarelo, `"4"` verde, `"5"` ciano, `"6"` roxo.

## Regras estritas

- ⛔ SEMPRE ler o `CLAUDE.md` do vault (se existir) antes de criar/editar notas.
- ⛔ Antes de escrever, glob/leitura rápida do vault para reaproveitar wikilinks e tags EXISTENTES — nunca criar tag nova quando há equivalente.
- ⛔ Datas reais no formato `YYYY-MM-DD` — nunca ano passado ou placeholder.
- ⛔ Confirmar com o usuário antes de mover/apagar arquivos do Inbox ou aplicar correções em massa.
- ⛔ Nunca quebrar formato Obsidian: wikilinks `[[ ]]`, YAML válido, tags minúsculas.

## Verificação

Nota criada = frontmatter parseia como YAML, wikilinks apontam para notas que existem (ou intencionalmente marcam nota futura), template correto usado. Em correção em massa: mostrar o relatório antes, aplicar só o aprovado.

## Saída esperada

Notas que abrem e linkam corretamente no Obsidian, grafo com conexões crescentes, e relatório curto do que foi criado/movido a cada fluxo do loop.

## Referências

Vídeo: https://www.youtube.com/watch?v=GWwGmUol4KQ · Kepano: https://github.com/kepano/obsidian-skills · JSON Canvas: https://jsoncanvas.org
