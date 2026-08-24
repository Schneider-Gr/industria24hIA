## ADDED Requirements

### Requirement: Upload de imagem valida tamanho e tipo antes de chegar ao Storage
`ImageUpload` DEVE rejeitar no client, antes de chamar `supabase.storage.upload()`, arquivos acima
de 5MB ou fora dos MIME types permitidos (`image/jpeg`, `image/png`, `image/webp`). Os buckets
`produtos`, `lojas` e `marketplace` DEVEM ter `file_size_limit`/`allowed_mime_types` configurados
no Supabase Storage como segunda camada, não contornável pelo client.

#### Scenario: Usuário seleciona um arquivo de 8MB
- **WHEN** o usuário escolhe um arquivo maior que 5MB no componente `ImageUpload`
- **THEN** o upload é rejeitado no client com mensagem de erro visível, sem chamada ao Storage

#### Scenario: Client alterado tenta contornar a validação
- **WHEN** um upload direto ao bucket `produtos`/`lojas`/`marketplace` chega fora dos limites de
  tamanho/MIME configurados
- **THEN** o Supabase Storage rejeita o upload independentemente da validação do client
