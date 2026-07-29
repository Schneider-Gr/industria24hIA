# PRD - Mobilidade urbana on-demand (chamar motoristas e transportadoras)

> Exportado do Confluence (espaco IND24H, page id 1605633) em 09/07/2026.

### Product overview

| Target date | A definir |
|---|---|
| Document status | DRAFT |
| Team members | Andreia Schneider |

### Objective

Permitir que compradores e fabricantes chamem motoristas e transportadoras avulsas sob demanda para retirada e entrega de carga, cobrindo o gap de frete quando nao ha afiliado de logistica vinculado ao produto (MPDD-21) nem rota programada disponivel (MPDD-22 Roteirizacao automatica).

### Problem statement

Hoje o frete do Industria24h depende de duas vias: o afiliado de logistica cadastrado a um produto especifico, ou a roteirizacao automatica com datas fixas programadas. Quando nenhuma das duas cobre a regiao ou o horario do pedido, a venda se perde por falta de frete disponivel, mesmo com produto e comprador prontos para fechar.

### Success metrics

| Metrica | Meta |
|---|---|
| Corridas avulsas completadas por mes | A definir apos piloto |
| Tempo medio entre solicitacao e aceite do motorista | < 15 min em capitais |
| % de vendas que hoje se perdem por falta de frete, recuperadas | A medir baseline antes/depois |
| Motoristas/transportadoras cadastrados ativos | A definir por regiao |

### Requirements

| Requisito | Descricao | Prioridade |
|---|---|---|
| Cadastro de motorista/transportadora | CNH, documento do veiculo, capacidade de carga, area de atuacao | Alta |
| Solicitacao de corrida | Origem, destino, peso/volume, janela de horario | Alta |
| Matching de corrida | Primeiro-a-aceitar ou leilao reverso de frete entre motoristas disponiveis | Alta |
| Precificacao dinamica | Por distancia/peso/urgencia, reaproveitando tabela de CEP de MPDD-22 | Alta |
| Rastreamento em tempo real | GPS da corrida em andamento, visivel para comprador e vendedor | Media |
| Confirmacao de entrega | Foto e/ou assinatura digital na entrega | Media |
| Avaliacao por corrida | Nota do motorista e do embarcador, historico de confiabilidade | Media |
| Pagamento do frete | Split automatico via Asaas (ver feedback-asaas-recursos-nativos-vs-custom) | Alta |

### Out of Scope

- Frota propria da Industria24h (modulo cobre apenas terceiros cadastrados).
- Transporte de passageiros (somente carga).
- Roteirizacao multi-parada complexa (fica com MPDD-22 quando aplicavel).

### Proposed solution

Modulo tipo 'Uber Frete': o embarcador (comprador ou fabricante) publica a corrida com origem, destino, peso/volume e janela de horario. Motoristas e transportadoras cadastrados na area de atuacao veem a corrida disponivel no seu painel e aceitam por ordem de chegada ou via leilao reverso de frete (menor preco ofertado vence). O preco base e calculado dinamicamente pela tabela de CEP ja usada em MPDD-22, ajustado por peso e urgencia. Apos aceite, o comprador acompanha a corrida em tempo real via GPS e recebe confirmacao de entrega com foto/assinatura. O split do frete entre motorista/transportadora e a plataforma acontece automaticamente via Asaas. Diferente do afiliado de logistica (vinculo fixo a um produto) e da roteirizacao automatica (rotas programadas com antecedencia), este modulo resolve o caso sob demanda e pontual, aumentando a cobertura geografica e reduzindo vendas perdidas por falta de frete.

Ideia relacionada: MPDD-43.

> Card ao vivo do Jira (ver na origem): https://andreiasworkspace-14440074.atlassian.net/issues/?jql=text ~ "MPDD-43*" or summary ~ "MPDD-43*" or key = MPDD-43 ORDER BY created DESC
