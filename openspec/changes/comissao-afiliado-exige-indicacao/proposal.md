## Why

QA de produção em 13/08/2026, jornada do afiliado, conta `seller-teste-i24`: 26 pedidos de "Tijolo cerâmico 6 furos" pagaram 5% de comissão a um afiliado que nunca divulgou nada. O produto não tem afiliação própria, e o afiliado creditado é o **dono da loja** — auto-afiliação.

A causa está em `checkout_criar_pedido` (versão de 3 argumentos, vigente desde 0101):

```sql
select a.afiliado_id, a.porcentagem into v_afil
from afiliacoes a
where a.status = 'Aprovada'
  and (a.produto_id = v_prod.id or a.loja_id = v_loja)
order by a.produto_id nulls last, a.created_at desc
limit 1;
```

Não há nenhuma referência ao link de divulgação. Basta existir uma afiliação Aprovada na loja para que **toda venda orgânica** credite comissão à afiliação mais recente. A migration 0065 acrescentou o parâmetro `ref` para que o link influenciasse a escolha, mas manteve o fallback: sem `ref`, "cai exatamente na regra antiga".

O efeito é vazamento de margem no caminho do dinheiro. Um seller que se afilia à própria loja passa a receber 5% sobre vendas que já eram dele, e o marketplace paga comissão de indicação sem indicação nenhuma.

Correções descartadas por não serem a causa: validar o código no `CapturaRef` antes de gravar o cookie. Um `?ref=` inválido não queima comissão de ninguém — o `update` de 0065 simplesmente não casa e o pedido cai no mesmo fallback. O problema não é o ref errado, é a comissão que existe sem ref algum.

## What Changes

- **BREAKING (comportamento financeiro):** comissão de afiliado passa a exigir link de divulgação. Sem `?ref=` válido, `repasse_afiliado = 0` e `afiliado_id = null`.
- A versão de 4 argumentos de `checkout_criar_pedido` vira a fonte da verdade da atribuição: zera a atribuição automática herdada da versão de 3 argumentos e credita apenas o afiliado cujo identificador casa com uma afiliação Aprovada válida para o produto/loja.
- A versão de 3 argumentos fica intacta — chamadas legadas seguem funcionando com o comportamento antigo.
- Não altera comissões já registradas. Os 26 pedidos existentes ficam como estão; se o dono quiser estorná-los, é decisão à parte.

## Capabilities

### New Capabilities
- `comissao-afiliado-atribuicao`: regra de atribuição de comissão de afiliado no fechamento do pedido — quem recebe, sob qual condição, e o que acontece sem link.

## Impact

- `supabase/migrations/0119_comissao_afiliado_exige_ref.sql`: redefine `checkout_criar_pedido(jsonb, jsonb, text, text)`.
- `src/components/vitrine/CapturaRef.tsx`: o comentário que descreve o fallback ("cai na regra automática — afiliação mais recente") deixa de valer e precisa ser corrigido.
- Painel do afiliado (`/afiliado`): tende a mostrar menos vendas creditadas daqui pra frente. Isso é o efeito pretendido, não regressão.
- Não toca em `repasse_ind` (5% da plataforma), que segue independente da afiliação.

## Decisão pendente do dono

Duas questões de negócio que este change **não** resolve e que precisam de posição:

1. **Auto-afiliação.** Um seller deve poder se afiliar à própria loja? Hoje pode. Se a resposta for não, cabe uma constraint separada barrando `afiliado_id` = dono da loja.
2. **Comissão de afiliado logístico.** As 39 entregas sob responsabilidade do afiliado logístico (incluindo dois pedidos de R$ 2.394,00) não geram linha de comissão nenhuma. Ou a remuneração não é calculada, ou não é exibida — nos dois casos o afiliado não tem como conferir o que vai receber. Escopo próprio.
