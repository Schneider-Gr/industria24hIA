## Why

Auditoria de segurança (sessão 31/08/2026, item 6 do checklist). Os 5 pontos de upload de
imagem do projeto (`ImageUpload.tsx` client → buckets `produtos`/`lojas`/`marketplace`;
Server Actions → buckets `entregas` e `disputas` via `afiliado/logistica/actions.ts`,
`parceiro/actions.ts`, `pedido/[id]/disputa/actions.ts`, `disputa-mediacao-upload.ts`) só
validavam **tamanho** e o **`Content-Type` declarado pelo cliente**. Nenhuma camada olhava
o conteúdo real do arquivo:

- `validarImagem()` e `disputa-mediacao-upload.ts` conferem `arquivo.type` — que o cliente
  forja livremente (`curl -F 'f=@payload.html;type=image/png'`).
- `allowed_mime_types` do Supabase Storage também valida contra o `Content-Type` do request,
  não contra os bytes.
- `file-type`/`sharp` não estão instalados.

Resultado: dá para subir HTML/JSON/SVG/executável renomeado com header `image/*`. Os buckets
`produtos`/`lojas`/`marketplace` são públicos → o arquivo fica servido de `*.supabase.co`
(phishing, distribuição de payload; XSS ali não pega a sessão do `industria24.com.br` por ser
outra origem, mas ainda é hospedagem de conteúdo arbitrário sob o domínio Supabase do projeto).

Agravante: o bucket **`entregas` é `public:true` e ficou de fora da migration 0143**
(`file_size_limit`/`allowed_mime_types`) — qualquer parceiro/afiliado autenticado sobe
qualquer tipo e qualquer tamanho, servido publicamente. O bucket `disputas` (privado)
também ficou de fora da 0143.

## What Changes

- `src/lib/validacao-imagem.ts` ganha `validarConteudoImagem(blob)` (confere os primeiros 12
  bytes contra a assinatura de JPG/PNG/WEBP/GIF — sem dependência nova, mesma linha `ponytail:`
  do projeto) e `validarImagemUpload(file)` (tamanho + MIME declarado + magic bytes), para uso
  server-side antes de `storage.upload`.
- Os 4 uploads originados de input do usuário passam a chamar `validarImagemUpload` /
  `validarConteudoImagem` antes do `storage.upload`: conclusão de corrida (afiliado e parceiro),
  abertura de disputa, canal de mediação de disputa.
- Os caminhos de storage desses uploads passam a usar `crypto.randomUUID() + extensão` em vez
  de `Date.now() + nome-do-arquivo` — o nome original do arquivo do usuário deixa de ir para o
  path (vazava filename e permitia caracteres arbitrários no path).
- `seller/produtos/ia-actions.ts` (imagem gerada por IA): dispensado com comentário `ponytail:`
  — os bytes vêm da API da OpenAI, não de upload do usuário.
- Migration `0154`: estende `file_size_limit` (5MB) + `allowed_mime_types` aos buckets
  `entregas` (jpg/png/webp) e `disputas` (jpg/png/webp/gif — gif aceito no canal de mediação),
  fechando a lacuna da 0143.

## Capabilities

### New Capabilities
- `upload-imagem-validacao-conteudo`: como o sistema garante que um arquivo enviado como imagem
  é de fato uma imagem, antes de gravá-lo no Storage.

## Impact

- `src/lib/validacao-imagem.ts`, `src/lib/validacao-imagem.test.ts`.
- `src/app/(afiliado)/afiliado/logistica/actions.ts`, `src/app/(parceiro)/parceiro/actions.ts`,
  `src/app/pedido/[id]/disputa/actions.ts`, `src/lib/disputa-mediacao-upload.ts`.
- `src/app/(seller)/seller/produtos/ia-actions.ts` (só comentário).
- `supabase/migrations/0154_storage_buckets_entregas_disputas_limite.sql` (novo).
- Implementado em PR #480 (`fix/upload-magic-bytes`). Esta change documenta a capability
  retroativamente; a migration 0154 ainda precisa ser aplicada em produção via
  `supabase db query --linked --file`.
- Fora de escopo: reprocessar a imagem com `sharp` (decode+re-encode mata payload embutido mas
  adiciona dependência) e tornar `entregas` privado com URL assinada — anotados como melhoria
  futura, não bloqueiam este fechamento.
