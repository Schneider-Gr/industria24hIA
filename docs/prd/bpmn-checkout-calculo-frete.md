# PRD — Checkout: Cálculo de Frete com Comissão de Afiliado Logística

## Problema
O checkout precisa exibir e cobrar um valor de frete que já embuta a comissão do afiliado logístico responsável pela região/parceiro, sem confundir com a comissão de venda do afiliado comercial.

## Fórmula
```
valor_frete_base        = tabela_frete(origem, destino, peso/volume)   // já existe ou via API externa
comissao_afiliado_pct   = resolve_comissao(afiliado_logistica_id)      // fixo por afiliado, v1
valor_frete_cobrado      = valor_frete_base * (1 + comissao_afiliado_pct)
comissao_afiliado_valor  = valor_frete_base * comissao_afiliado_pct
valor_repasse_parceiro   = valor_frete_base - taxa_plataforma_frete
```

## Pré-requisito de dados
Antes do checkout calcular, precisa resolver `afiliado_logistica_id` a partir de:
- Região de entrega (CEP) → tabela `regiao_afiliado_logistica` (mapeamento região↔afiliado), OU
- Seller → afiliado (se o vínculo for por seller, não por região) — **decisão de produto pendente, bloqueia implementação**.

Se nenhum afiliado cobrir a região, usa comissão de plataforma padrão (sem repasse a afiliado) e some direto pro pool geral de parceiros.

## Exibição ao cliente
Checkout mostra só `valor_frete_cobrado` (total). Composição (base/comissão) é interna, não exibida ao cliente final — evita fricção de UX questionando "por que o frete tem comissão".

## Regras de negócio
1. `comissao_afiliado_pct` é resolvido no momento do checkout, não no momento da entrega (evita afiliado mudar comissão retroativamente numa corrida já cotada).
2. Se o pedido for cancelado antes do pagamento, nenhuma comissão é gerada.
3. Mudança de tabela de comissão do afiliado só vale para corridas cotadas depois da mudança.

## Fora de escopo (v1)
- Comissão variável por distância/faixa (fixo por afiliado na v1, evoluir se dado mostrar necessidade).
- Frete grátis/subsidiado (trata como valor_frete_base = 0, comissão zerada).

## Dependências
- PRD Afiliado Logística (fonte do `comissao_afiliado_pct`).
- PRD Corridas/Despacho (consome `valor_frete_base`/`comissao_afiliado_pct` gravados na corrida).
- **Bloqueio de decisão**: modelo de mapeamento região↔afiliado precisa ser definido com o dono do produto antes de codar.
