## 1. Schema e RLS

- [ ] 1.1 Checar colisão de número de migration (skill `migrations-industria24`) e criar migration com `disputa_respostas` e `disputa_anexos` (schema em design.md), RLS negar-por-padrão
- [ ] 1.2 Policy: seller insere/lê resposta só de pedido da própria loja, com `disputa_aberta_em` não nulo e `status_pedido <> 'Cancelado'`
- [ ] 1.3 Policy: admin lê tudo via `is_admin()` (mesmo padrão de `repasses`)
- [ ] 1.4 Definir e criar bucket/path de Storage para os anexos (confirmar convenção existente de bucket privado por loja antes de criar um novo — skill `rls-seguranca`)
- [ ] 1.5 Testar migration em `begin; … select <verificação>; rollback;` via `supabase db query --linked --file`
- [ ] 1.6 Rodar `generate typescript types` e revisar `database.types.ts`

## 2. Área do seller

- [ ] 2.1 Listar pedidos da loja do seller com `disputa_aberta_em` não nulo (data + motivo)
- [ ] 2.2 Tela/seção de detalhe do pedido: formulário de resposta (texto) + upload de anexo reaproveitando `src/components/ImageUpload.tsx`
- [ ] 2.3 Bloquear envio quando `status_pedido = 'Cancelado'`, com mensagem explicando que a disputa já foi decidida
- [ ] 2.4 Exibir respostas já enviadas pelo seller naquele pedido (histórico)

## 3. Área do admin

- [ ] 3.1 Em `/admin/pedidos` (ou tela de detalhe), exibir resposta e anexos do seller antes dos botões de `AcoesPedido.tsx`
- [ ] 3.2 Link/preview dos anexos (respeitando bucket privado — signed URL, não path público)

## 4. Notificação

- [ ] 4.1 Confirmar canal e ponto de disparo (trigger SQL vs. server action) usado hoje para notificar o seller — resolver a Open Question do design.md antes desta tarefa
- [ ] 4.2 Disparar notificação ao seller quando `admin_abrir_disputa` é executada, referenciando pedido e motivo
- [ ] 4.3 Teste manual: abrir disputa de teste, confirmar notificação recebida

## 5. Verificação

- [ ] 5.1 `node --experimental-strip-types` em teste novo cobrindo a policy de RLS (padrão `supabase/tests/*.sql` com `begin/rollback`) para os cenários de "outra loja" e "pedido já estornado"
- [ ] 5.2 `npx tsc --noEmit` limpo
- [ ] 5.3 `npm run lint` limpo
- [ ] 5.4 QA manual ponta a ponta: admin abre disputa → seller vê e responde com anexo → admin vê resposta → admin estorna → seller não consegue mais responder
