# PRD — Afiliado Logística

## Problema
O marketplace precisa de uma camada de intermediação comercial para recrutar e gerenciar parceiros logísticos (motoristas/transportadoras avulsas) por região, remunerada por comissão sobre o frete gerado.

## Escopo
Entidade `afiliado_logistica`, distinta de `afiliado` comercial (venda de produto). Um afiliado logístico:
- Se cadastra e é aprovado pela plataforma (KYC básico: CPF/CNPJ, dados bancários/PIX).
- Recruta parceiros logísticos e os vincula à sua carteira (`parceiro_logistico.afiliado_logistica_id`).
- Define ou recebe da plataforma um `comissao_pct` (fixo por afiliado ou por faixa de distância/região — decisão pendente, ver PRD Checkout).
- Acompanha corridas geradas pelos seus parceiros e o extrato de comissão (dashboard `/afiliado/logistica`).

## Fora de escopo (v1)
- Comissão hierárquica (afiliado de afiliado).
- Negociação de comissão por parceiro individual dentro da carteira do afiliado.

## Regras de negócio
1. Um parceiro logístico pertence a no máximo um afiliado logístico por vez.
2. Se uma corrida não encontra parceiro do afiliado da região, cai no pool geral da plataforma (sem comissão de afiliado — regra a confirmar com o dono do produto).
3. Comissão é calculada sobre `valor_frete_base`, nunca sobre o valor do produto.
4. Liquidação segue o modelo já decidido: repasse via PIX direto, não Split/subconta (ver memória `industria24h-repasse-pix-decisao`).

## Métricas de sucesso
- Nº de parceiros ativos por afiliado.
- Taxa de corridas atendidas pelo pool do afiliado vs. pool geral.
- Tempo médio de aceite de corrida por afiliado.

## Dependências
- PRD Parceiro Logístico (cadastro e disponibilidade).
- PRD Corridas/Despacho (matching e ciclo de vida).
- PRD Checkout — Cálculo de Frete.
