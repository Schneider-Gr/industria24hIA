---
name: fila-retomada
description: Retomar trabalho no Industria24h — onde parou, pendências abertas, checkpoint de sessão. Use no início de sessão de trabalho no projeto, quando o usuário perguntar "onde paramos", "veja a fila", "o que falta", ou pedir para continuar o backlog.
---

# Fila de Retomada — Industria24h

## Ao retomar

1. Ler a memória `industria24h-pendencias-paineis-2026-07-21` (fila principal) e o índice MEMORY.md, seção Indústria 24h.
2. **Reler o código ATUAL antes de aplicar qualquer correção herdada** — sessões concorrentes podem já ter resolvido (já aconteceu: 7/11 bugs corrigidos em PR paralelo).
3. Conferir branch/worktree: uma sessão por working tree; dev novo = worktree próprio.

## Fila conhecida (estado 22/07 — validar antes de executar)

1. **Teste de compra com `?ref=`** de afiliado em prod (pendente desde PR #65).
2. **QA logado em prod** dos 3 painéis redesenhados.
3. **Artes dos banners** da vitrine (ainda roxo/amarelo legado).
4. **Repasse PIX:** aplicar 0058 + webhook Asaas + QA sandbox (ação do usuário, cobrar status).
5. **MCP terceiros:** aplicar 0059 + Inspector + deploy mcp.industria24.com.br.
6. **Resend:** DKIM/SPF/MX no registro.br.
7. **Soft-404 SEO** (ver skill `seo-industria24`).
8. Rotações de segredo pendentes (ver skill `rls-seguranca`).

## Checkpoint (disciplina de sessão)

- Ao concluir cada marco, gravar 1 linha de status na memória do projeto **sem esperar o usuário pedir**.
- Ao encerrar tarefa grande, atualizar a memória de pendências com o novo estado da fila e o próximo passo concreto.
- "Feito" = verificado (teste, `to_regclass`, `vercel inspect`, rota 200) — nunca só "código escrito".
