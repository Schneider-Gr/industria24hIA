## 1. Client de envio

- [ ] 1.1 Criar `src/lib/bubblewhats.ts`: `isBubblewhatsConfigured` (checa as 3
      env vars de envio), `enviarBubblewhats(jid, mensagem)` fazendo
      `POST {BUBBLEWHATS_API_URL}/send-message` com header
      `Authorization: {BUBBLEWHATS_TOKEN}`.
- [ ] 1.2 Tratar cada código de resposta (200/401/408/422/502) com retorno
      tipado e log/Sentry distinto por código — nunca lançar exceção genérica
      que esconda qual caso ocorreu.
- [ ] 1.3 `src/lib/bubblewhats.test.ts` (Vitest, Red-Green-Refactor): mock de
      `fetch` cobrindo os 5 códigos de resposta.

## 2. Webhook de recebimento

- [ ] 2.1 Criar `src/app/api/webhooks/bubblewhats/route.ts`: valida
      `request.nextUrl.searchParams.get("secret")` contra
      `BUBBLEWHATS_WEBHOOK_SECRET` (comparação timing-safe) antes de ler o
      body; sem secret configurado ou inválido → 401 sem processar payload.
- [ ] 2.2 Distinguir os 3 tipos de evento (mensagem recebida, status de
      mensagem, status do aparelho) e logar cada um; persistência em banco
      fica fora deste escopo até haver schema confirmado (CLAUDE.md raiz:
      nunca inventar schema).
- [ ] 2.3 Log/Sentry com tag própria (`gateway: "bubblewhats"`) para não se
      confundir com os logs da integração Meta Cloud API existente.

## 3. Segurança e não-interferência

- [ ] 3.1 Confirmar que nenhuma chamada deste trabalho usa endpoint de
      configuração do BubbleWhats (só `send-message` e o próprio webhook
      recebendo eventos) — nada de criar/editar/deletar aparelho ou webhook
      no painel.
- [ ] 3.2 Nenhuma credencial em texto puro; todas via `process.env`.

## 4. Documentação e fechamento

- [ ] 4.1 Abrir PR referenciando `Closes #346`.
- [ ] 4.2 Após merge, arquivar esta change (`openspec archive`).
