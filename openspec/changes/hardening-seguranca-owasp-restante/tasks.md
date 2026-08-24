## 1. Erro genérico ao client (achado #4)

- [ ] 1.1 `src/lib/api/erro-generico.ts` + `.test.ts` (Red-Green-Refactor): função que recebe o
      erro, chama `Sentry.captureException`, e retorna `NextResponse.json({ error: "Erro ao
      processar requisição" }, { status })`.
- [ ] 1.2 Aplicar em `src/app/api/asaas/webhook/route.ts` (linhas 351 e 408).
- [ ] 1.3 Aplicar em `src/app/api/observabilidade/cron/route.ts` (linha 28).
- [ ] 1.4 Aplicar em `src/app/api/curadoria-ia/route.ts` (linha 71).
- [ ] 1.5 Aplicar em `src/app/api/carrinho/abandono/tick/route.ts` (linha 42).
- [ ] 1.6 Aplicar em `src/app/api/carrinho/sync/route.ts` (linha 28).
- [ ] 1.7 `grep -rn "error: error.message" src/app/api` deve retornar vazio depois do PR.
- [ ] 1.8 `npm run test && npm run build && npm run lint`.
- [ ] 1.9 Branch `fix/erro-generico-client-api`, PR referenciando a Issue deste change.

## 2. Validação de upload de imagem (achado #5)

- [ ] 2.1 Ler `src/lib/disputa-mediacao-upload.ts` e extrair a validação de tamanho/MIME para um
      helper compartilhado se ainda não for reutilizável como está.
- [ ] 2.2 `src/components/ImageUpload.tsx`: validar tamanho (5MB) e MIME
      (`image/jpeg`,`image/png`,`image/webp`) antes de `supabase.storage.upload()`, com mensagem
      de erro visível ao usuário.
- [ ] 2.3 Migration SQL nova (numeração manual, checar colisão antes) configurando
      `file_size_limit`/`allowed_mime_types` nos buckets `produtos`, `lojas`, `marketplace` —
      confirmar a API real do Storage (`storage.buckets` ou `supabase storage update`) antes de
      escrever, não assumir sintaxe.
- [ ] 2.4 Testar a migration em `begin; ... rollback;` via `supabase db query --linked --file`
      antes de aplicar de verdade.
- [ ] 2.5 QA manual: tentar subir um arquivo >5MB e um `.pdf` renomeado para `.png` em
      produto/loja/marketplace, confirmar rejeição em ambas as camadas (client e bucket).
- [ ] 2.6 Branch `fix/upload-imagem-validacao-server-side`, PR próprio.

## 3. Validação de input com zod nas Server Actions financeiras (achado #6)

- [ ] 3.1 `npm install zod`.
- [ ] 3.2 `src/lib/checkout/schemas.ts` + `.test.ts` (Red-Green-Refactor) para o payload de
      `src/app/checkout/actions.ts`.
- [ ] 3.3 `src/lib/coletiva/schemas.ts` + `.test.ts` para `src/app/coletiva/actions.ts`.
- [ ] 3.4 `src/lib/leilao/schemas.ts` + `.test.ts` para `src/app/leilao/actions.ts`.
- [ ] 3.5 Aplicar os três schemas nas Server Actions correspondentes, retornando erro de validação
      claro ao invés de deixar o erro do Postgres estourar.
- [ ] 3.6 Documentar no corpo do PR que o rollout é incremental (strangler fig) — resto do projeto
      migra conforme cada arquivo for tocado por outro motivo, sem prazo fixo.
- [ ] 3.7 `npm run test && npm run build && npm run lint`.
- [ ] 3.8 Branch `feat/validacao-zod-checkout-coletiva-leilao`, PR próprio.

## 4. Pendências de decisão humana (sem tarefa de código aqui)

- [ ] 4.1 Perguntar ao usuário: manter a decisão já tomada em PR #397 de adiar Upstash até haver
      abuso real medido, ou reverter e migrar `src/lib/rate-limit.ts` agora (achado #7)?
- [ ] 4.2 Perguntar ao time: algum campo de PII (CPF/CNPJ, endereço) precisa de criptografia
      adicional via pgcrypto (achado #10)? Não implementar sem resposta explícita.
- [ ] 4.3 Perguntar onde gravar as credenciais Cloudflare Turnstile antes de abrir um change
      separado para bot-protection em formulários públicos (achado #8, Prioridade 3, fora deste
      change).
