## Purpose

Garantir que um arquivo enviado a um bucket de imagem do projeto seja de fato uma imagem,
fechando a lacuna em que todas as camadas (validação client, validação server, `allowed_mime_types`
do Storage) confiavam apenas no `Content-Type` declarado pelo cliente — que é forjável.

## ADDED Requirements

### Requirement: Upload de imagem de input do usuário valida os magic bytes no servidor
Toda Server Action ou route handler que recebe um arquivo de imagem enviado pelo usuário e o
grava em Storage SHALL, antes do `storage.upload`, verificar os primeiros bytes do arquivo
contra a assinatura de um formato de imagem aceito (JPEG, PNG, WEBP, GIF) e rejeitar o upload
quando não houver correspondência — independentemente do `Content-Type` declarado e da extensão
do nome do arquivo.

#### Scenario: Arquivo real de imagem é aceito
- **WHEN** o usuário envia um JPG/PNG/WEBP válido pelo formulário (conclusão de corrida, abertura
  de disputa, canal de mediação)
- **THEN** a validação passa e o arquivo é gravado no bucket

#### Scenario: Arquivo não-imagem com Content-Type forjado é recusado
- **WHEN** um request envia um arquivo HTML/JSON/executável com header `Content-Type: image/png`
  e nome `foto.png`
- **THEN** a Server Action rejeita antes do `storage.upload` e retorna erro ao usuário, sem
  gravar nada no Storage

#### Scenario: Nome do arquivo do usuário não vai para o path do Storage
- **WHEN** um upload de imagem de input do usuário é gravado
- **THEN** o path usa um identificador aleatório (`crypto.randomUUID()`) mais a extensão, e o
  nome original do arquivo não aparece no path

### Requirement: Buckets de imagem têm teto de tamanho e allowlist de MIME
Todos os buckets de Storage que recebem imagem (`produtos`, `lojas`, `marketplace`, `entregas`,
`disputas`) SHALL ter `file_size_limit` e `allowed_mime_types` configurados, como camada
server-side não contornável independente da validação em código.

#### Scenario: Upload acima do teto é recusado pelo Storage
- **WHEN** um upload de mais de 5 MB chega a qualquer bucket de imagem
- **THEN** o Supabase Storage recusa o upload

#### Scenario: Bucket entregas não aceita mais qualquer tipo
- **WHEN** um upload com MIME fora de `image/jpeg|png|webp` chega ao bucket `entregas`
- **THEN** o Supabase Storage recusa o upload (antes da migration 0154 ele aceitava qualquer tipo)
