# PRD - Afiliado de Logistica (transporte por produto)

> Exportado do Confluence (espaco IND24H, page id 557057) em 09/07/2026.

### Product overview

| **Target date** | A definir |
|---|---|
| **Document status** | DRAFT |
| **Team members** | Andreia Schneider |

### Objective

Permitir que transportadores/motoristas se afiliem a produtos especificos da Industria24h para realizar o frete, recebendo comissao por entrega. Objetivo: resolver a lacuna de frete real (hoje manual/10% ad valorem, ver KAN-14 e KAN-21) usando uma rede de afiliados de logistica em vez de contrato fixo com transportadora, escalando com o marketplace sem custo fixo antecipado.

### Problem statement

Compradores B2B em Manaus/Amazonas tem poucas opcoes de frete confiavel para carga industrial. A plataforma hoje cobra frete manual estimado (10% ad valorem), sem garantia de disponibilidade real de transporte nem rastreio. Sellers pequenos nao tem capacidade logistica propria. Sem frete confiavel, pedidos de maior volume/distancia sao abandonados no checkout.

### Success metrics

| **Goal** | **Metric** |
|---|---|
| Reduzir abandono de checkout por frete | % de pedidos concluidos com frete calculado vs frete manual |
| Cobertura de transporte sem custo fixo | Numero de afiliados de logistica ativos por regiao |
| Confiabilidade de entrega | % de entregas confirmadas no prazo |

### Requirements

| **Requirement** | **Importance** |
|---|---|
| Transportador se cadastra e se afilia a um produto/rota especifico | HIGH |
| Sistema atribui o pedido ao afiliado de logistica disponivel na regiao | HIGH |
| Comissao de frete calculada e liberada apos confirmacao de entrega | HIGH |
| Comprador acompanha status de entrega (reaproveitar painel de afiliado existente, ver KAN-90) | MEDIUM |

### Out of Scope

Frota propria da Industria24h; seguro de carga; rastreio GPS em tempo real (v1 usa confirmacao manual de entrega).

### Proposed solution

Reaproveitar o modelo de afiliado ja existente na plataforma (ver KAN-15, paineis afiliado/logistica): criar um novo tipo de afiliacao 'logistica' vinculada a produto/rota em vez de a venda. Ao aceitar a afiliacao, o transportador vira opcao de frete no checkout daquele produto/regiao. Comissao segue a mesma maquina de estados de KAN-90 (gerada -> pendente -> aprovada/cancelada).

### Ideia relacionada no Jira Product Discovery

Ver MPDD-21 (Afiliado de logistica) no board de descoberta. Para embutir o card ao vivo aqui, use o macro 'Jira Product Discovery' do editor do Confluence e cole o link da ideia MPDD-21 - esse passo e manual, o editor de macro nao e acessivel via API.



> Card ao vivo do Jira (ver na origem): https://andreiasworkspace-14440074.atlassian.net/issues/?jql=text%20~%20%22MPDD-21*%22%20or%20summary%20~%20%22MPDD-21*%22%20or%20key%20%3D%20MPDD-21%20ORDER%20BY%20created%20DESC
