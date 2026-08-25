## 1. Erro genérico ao client (achado #4)

- [x] 1.1 `src/lib/api/erro-generico.ts` + `.test.ts` (Red-Green-Refactor): `respostaErroGenerico()`
      chama `Sentry.captureException` e retorna `NextResponse.json({ error: "Erro ao processar
      requisição" }, { status })`.
- [x] 1.2 Aplicado em `src/app/api/asaas/webhook/route.ts` (2 pontos).
- [x] 1.3 Aplicado em `src/app/api/observabilidade/cron/route.ts`.
- [x] 1.4 Aplicado em `src/app/api/curadoria-ia/route.ts`.
- [x] 1.5 Aplicado em `src/app/api/carrinho/abandono/tick/route.ts` (mantém o log em
      `registrarEvento`, só troca a resposta HTTP).
- [x] 1.6 Aplicado em `src/app/api/carrinho/sync/route.ts`.
- [x] 1.7 `grep -rn "error: error.message" src/app/api` confirmado vazio.
- [x] 1.8 `npm run test` (68/68), `npm run build`, `eslint` limpos.
- [x] 1.9 Branch `fix/erro-generico-client-api`, PR **#400** aberto.

## 2. Validação de upload de imagem (achado #5)

- [x] 2.1 `src/lib/validacao-imagem.ts` (novo): validação pura reaproveitável, mesmo teto de
      `disputa-mediacao-upload.ts` (5MB), MIME restrito a jpeg/png/webp.
- [x] 2.2 `src/components/ImageUpload.tsx`: valida antes de `supabase.storage.upload()`, mensagem
      de erro visível; `accept` do input restrito aos três MIME types.
- [x] 2.3 Migration `0143_storage_buckets_limite_imagem.sql`: `file_size_limit`/`allowed_mime_types`
      via `update storage.buckets` nos três buckets.
- [x] 2.4 Testada em `begin; ... rollback;` via `supabase db query --linked --file`.
- [x] 2.5 Aplicada e **confirmada em produção** (`select id, file_size_limit, allowed_mime_types
      from storage.buckets`). QA manual de upload real (>5MB / MIME trocado) fica para quem revisar
      o PR em preview — não executado nesta sessão (sem UI de produto/loja disponível para
      exercitar o componente ao vivo).
- [x] 2.6 Branch `fix/upload-imagem-validacao-server-side`, PR **#401** aberto.

## 3. Validação de input com zod nas Server Actions financeiras (achado #6)

- [x] 3.1 `npm install zod` (`^4.4.3`).
- [x] 3.2 `src/lib/checkout/schemas.ts` + `.test.ts` para o payload de
      `src/app/checkout/actions.ts` (itens do carrinho, frete por loja, forma de pagamento,
      cpf/cnpj).
- [x] 3.3 `src/lib/coletiva/schemas.ts` + `.test.ts` para `src/app/coletiva/actions.ts`.
- [x] 3.4 `src/lib/leilao/schemas.ts` + `.test.ts` para `src/app/leilao/actions.ts`.
- [x] 3.5 Aplicado nas seis Server Actions das três áreas — preço/estoque continuam recalculados
      nas RPCs (`checkout_criar_pedido` etc.), isto valida forma/tipo antes de chamar a RPC.
- [x] 3.6 Documentado no corpo do PR: rollout incremental (strangler fig), sem prazo para o resto
      do projeto.
- [x] 3.7 `npm run test` (81/81), `npx tsc --noEmit`, `npm run build`, `eslint` limpos.
- [x] 3.8 Branch `feat/validacao-zod-checkout-coletiva-leilao`, PR **#403** aberto.

## 4. Pendências de decisão humana — resolvidas em 24/08/2026

- [x] 4.1 **Achado #7 (rate limit Upstash)**: usuário confirmou manter a decisão do PR #397 (adiar
      até haver abuso real medido via Sentry). Nenhuma ação de código.
- [x] 4.2 **Achado #10 (pgcrypto)**: usuário confirmou manter como está — Supabase já cobre disco
      em repouso e TLS em trânsito, sem campo de PII identificado que justifique criptografia de
      coluna adicional agora. Nenhuma ação de código.
- [x] 4.3 **Achado #8 (Cloudflare Turnstile)**: usuário ainda não tem conta Cloudflare — fica fora
      do escopo até existir. Retomar como change separado quando a conta existir.
