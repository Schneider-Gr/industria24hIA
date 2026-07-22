---
name: incidentes-runbook
description: Resposta a incidente em produção do Industria24h — triagem, contenção, rollback, Sentry. Use quando produção quebrar, houver suspeita de fraude/vazamento/credencial exposta, ou o usuário reportar "está fora do ar" / "dinheiro errado".
---

# Incidentes — Industria24h

Runbook completo: `docs/security-incident-runbook.md` (revisão 21/07). Esta skill é o atalho operacional; em incidente real, abrir o runbook e seguir as seções.

## Primeiros 15 minutos

1. Classificar: P1 (dinheiro saindo errado / dado vazando / prod fora do ar) age imediatamente; P2 vulnerabilidade sem exploração; P3 higiene.
2. Escopo: produção é o projeto Supabase `tiwdqgyeyvceaiqqwitc` e o domínio industria24.com.br — confirmar que não é só preview.
3. **Ativo agora → conter antes de investigar.** Fraude em repasse: pausar webhook `/transfers` no Asaas primeiro.
4. Registrar tudo com timestamp em `incidente-YYYYMMDD.md` desde o minuto zero.

## Contenção rápida por tipo

- **Credencial exposta:** rotacionar no provedor ANTES de limpar histórico; revogar a antiga; checar logs de uso no intervalo.
- **Fraude repasse:** pausar transferências → inspecionar com `begin; … rollback;` → corrigir com migration testada → conciliar com Asaas.
- **Conta comprometida:** revogar refresh tokens (Supabase Auth), reset de senha, auditar mudança de chave PIX.
- **Vazamento RLS:** confirmar com teste de acesso, fechar policy negar-por-padrão, estimar registros → LGPD (seção 4 do runbook).
- **Fora do ar:** `vercel inspect` + status Supabase para localizar a camada; `vercel rollback` se correlacionado ao último deploy.

## Ferramentas

- **Sentry:** projeto `schneider-g5/industria24h-web` — primeira parada para erro de runtime em prod.
- Dado em prod: `supabase db query --linked` (nunca alterar fora de transação durante incidente).
- ⚠ soft-404 devolve 200: rota "no ar" exige validar conteúdo, não status code.

## Depois

Post-mortem curto no `incidente-YYYYMMDD.md` (causa raiz, o que muda), atualizar runbook/skills se o processo falhou, e checkpoint na memória do projeto.
