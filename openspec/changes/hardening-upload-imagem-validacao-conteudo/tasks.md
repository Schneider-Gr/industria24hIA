## 1. Validação de conteúdo na lib
- [x] 1.1 `src/lib/validacao-imagem.ts`: `validarConteudoImagem(blob)` — magic bytes
      JPG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`), WEBP (`RIFF....WEBP`), GIF (`GIF8`)
- [x] 1.2 `validarImagemUpload(file)` — compõe `validarImagem` (tamanho + MIME) + `validarConteudoImagem`
- [x] 1.3 `src/lib/validacao-imagem.test.ts`: bytes válidos por formato, `image/png` declarado
      com bytes de texto → rejeitado, arquivo curto → rejeitado

## 2. Aplicar nos uploads de input do usuário
- [x] 2.1 `afiliado/logistica/actions.ts` (foto de conclusão de corrida) → `validarImagemUpload`
- [x] 2.2 `parceiro/actions.ts` (idem) → `validarImagemUpload`
- [x] 2.3 `pedido/[id]/disputa/actions.ts` (evidência de abertura) → `validarConteudoImagem` por foto
- [x] 2.4 `src/lib/disputa-mediacao-upload.ts` (canal de mediação) → `validarConteudoImagem`
- [x] 2.5 paths de storage passam a `crypto.randomUUID() + ext` (sai o nome do arquivo do usuário)
- [x] 2.6 `seller/produtos/ia-actions.ts`: comentário `ponytail:` explicando dispensa (bytes da OpenAI)

## 3. Teto de tamanho/MIME nos buckets faltantes
- [x] 3.1 Migration `0154_storage_buckets_entregas_disputas_limite.sql`: `file_size_limit` 5MB +
      `allowed_mime_types` para `entregas` e `disputas` (0143 só pegou produtos/lojas/marketplace)
- [ ] 3.2 Aplicar 0154 em produção: `supabase db query --linked --file supabase/migrations/0154_storage_buckets_entregas_disputas_limite.sql`
- [ ] 3.3 Confirmar no schema real: `select id, file_size_limit, allowed_mime_types from storage.buckets where id in ('entregas','disputas')`

## 4. Fechamento
- [x] 4.1 `npm run lint` + `npm run test` passando
- [x] 4.2 PR #480 aberto referenciando a Issue de origem
- [ ] 4.3 Merge do #480 após aplicar 0154 (migration nova pede confirmação do usuário — regra do CLAUDE.md)
