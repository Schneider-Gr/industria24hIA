## Context

Hoje a disputa é só um timestamp (`pedidos.disputa_aberta_em`), sem tabela
própria e sem workflow de estados (decisão de escopo confirmada com o dono em
25/07, migration `0084_admin_repasses_estorno.sql`). O admin decide via
`admin_estornar_pedido` sem qualquer insumo do seller. Ver proposal.md - Why.

Padrões já existentes no repo a reaproveitar, não recriar:
- Upload de arquivo: `src/components/ImageUpload.tsx` + Supabase Storage
  (usado em `(afiliado)/afiliado/logistica`, `(seller)/seller/produtos`,
  `(parceiro)/parceiro`).
- Notificação ao seller: `src/lib/email.ts` e `src/lib/whatsapp.ts` — usar o
  canal que essas libs já usam para o seller hoje, não introduzir um terceiro.

## Goals / Non-Goals

**Goals:**
- Dar ao seller visibilidade e um único ponto de resposta (texto + anexo) por
  disputa aberta, antes da decisão do admin.
- Dar ao admin, na mesma tela onde ele já decide (`/admin/pedidos`), acesso a
  essa resposta sem trocar de tela.

**Non-Goals:**
- Não introduz estados de disputa (aberta/em análise/resolvida) — continua
  sendo timestamp + agora resposta opcional, não uma máquina de estados.
- Não altera `admin_estornar_pedido` nem `admin_abrir_disputa` — o admin
  continua decidindo sozinho, com mais informação, não com aprovação do
  seller.
- Não integra com Asaas nem automatiza reversão financeira.

## Decisions

**Nova tabela `disputa_respostas` (não reaproveitar `auditoria_eventos`).**
`auditoria_eventos` é log de ações do admin, append-only e sem RLS pensada
para escrita do seller. Uma tabela dedicada permite RLS restrita ao seller
dono da loja do pedido, e permite múltiplas respostas/anexos sem sobrecarregar
o formato de log.

Schema:
```
disputa_respostas (
  id           uuid pk default gen_random_uuid(),
  pedido_id    uuid not null references pedidos(id) on delete cascade,
  seller_id    uuid not null references auth.users(id),
  mensagem     text not null,
  criado_em    timestamptz not null default now()
)
disputa_anexos (
  id           uuid pk default gen_random_uuid(),
  resposta_id  uuid not null references disputa_respostas(id) on delete cascade,
  storage_path text not null,
  criado_em    timestamptz not null default now()
)
```
Um bucket de Storage dedicado (`disputas`) ou path prefixado dentro de um
bucket existente — confirmar com a skill `rls-seguranca` qual convenção o
projeto já usa para anexos privados por loja antes de criar bucket novo.

**RLS: seller só grava/lê resposta de pedido da própria loja, com
`disputa_aberta_em` não nulo e `status_pedido <> 'Cancelado'`.** Reforça em
banco a mesma regra descrita nos requirements de `posvenda/seller-disputa`,
não confiar só na UI. Admin lê tudo via `is_admin()`, como as outras tabelas
deste domínio (`repasses`).

**Sem RPC dedicada para inserir a resposta — insert direto na tabela via
RLS.** Ao contrário de `admin_estornar_pedido`/`admin_abrir_disputa` (que têm
lógica multi-tabela e exigem `security definer`), a resposta do seller é um
insert simples de uma linha + anexos; RLS supre a checagem de posse sem
precisar de função privilegiada. Reconsiderar só se a validação
(`status_pedido <> 'Cancelado'`) não puder ser expressa numa `check`/policy
simples.

**Notificação síncrona no momento de `admin_abrir_disputa`, via trigger ou
chamada explícita na action do admin — decidir qual ao implementar,
verificando se outras notificações do seller já usam trigger de banco ou
chamada de app.** Ver Open Questions.

## Risks / Trade-offs

- [Seller poderia inflar respostas/anexos sem limite] → aplicar o mesmo limite
  de tamanho/quantidade que `ImageUpload.tsx` já impõe hoje, sem criar regra
  nova.
- [Admin decide antes do seller responder, resposta chega tarde] → aceitável
  neste escopo (não-goal é workflow de bloqueio); a tela do admin só melhora
  a informação disponível, não impede a decisão.

## Open Questions

- Notificação ao seller: confirmar se o padrão existente (`email.ts` /
  `whatsapp.ts`) já dispara a partir de trigger SQL ou de server action, para
  seguir a mesma convenção em vez de introduzir uma segunda — não muda specs
  nem tasks, só o ponto de integração exato.
