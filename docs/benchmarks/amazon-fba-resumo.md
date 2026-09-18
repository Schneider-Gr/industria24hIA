# Benchmark: programa de fulfillment da Amazon Brasil (FBA)

Fonte: https://venda.amazon.com.br/cresca/fba (coletado via Firecrawl em 18/09/2026; cache da página de 17/09/2026). As subpáginas de tarifas, restrições e treinamento apontam para o Seller Central, que exige login; o resumo cobre o que a página pública expõe. Uso interno: referência de estrutura, nunca de texto.

## Estrutura da página
Hero com oferta de teste grátis → âncoras (o que é, benefícios, elegibilidade, custos, como começar, incentivos, filiais, programas logísticos, FAQ) → depoimentos → tabelas de tarifa → passo a passo → programa de filiais → incentivos → comparativo de modalidades logísticas → FAQ → CTA final.

## Como funciona
- O vendedor envia estoque ao centro de distribuição; a Amazon armazena, embala, entrega, atende o cliente e processa devoluções.
- Passos: (1) configurar o emissor de nota da Amazon, (2) listar produtos no programa, (3) criar o envio e preparar os produtos, (4) a Amazon coleta ou o vendedor entrega no CD.

## Benefícios anunciados
- Selo de entrega rápida/Prime e frete grátis para membros.
- Pós-venda (status, reembolso, devolução) por conta da Amazon.
- Equipe do vendedor liberada da operação logística.
- Número de marketing: "crescem vendas em média 4x" (dado interno, com ressalva).

## Requisitos
- CNPJ ativo com NF-e, Simples ou Regime Normal, IE em estados com CD (SP, MG, PR, RJ, SC, RS, CE, DF, PE, BA, GO, ES).
- Fora desses estados: programa de filiais (abrir filial no endereço do CD ou em endereço próprio, com contabilidade parceira).
- Limites físicos: até 22 kg, nenhum lado acima de 100 cm, soma das dimensões até 200 cm; categorias restritas e produtos perigosos com regra própria.
- Sem mínimo de unidades por envio; recomenda enviar itens de alto giro (curva A).

## Tarifas (tabela pública, atualizada 01/08/2025)
- Comissão de venda + tarifa de logística por unidade (faixa de preço × peso real ou cubado, IATA ÷ 6000; inclui 20 g de embalagem).
- Armazenagem mensal por m³ (valor maior para itens pequenos), armazenagem de longo prazo acima de 365 dias.
- Remoção de inventário por unidade; coleta opcional por caixa, variando por estado.
- Incentivos: 30 dias grátis para contas novas, tarifa reduzida condicionada a investimento em anúncios, comissão reduzida para itens novos, suporte de parceiros para onboarding.

## FAQ (temas)
Elegibilidade, frete grátis, custo, limites de tamanho, categorias proibidas, itens recomendados, integradores homologados, tempo máximo de armazenagem (indefinido se vendável; não vendável é descartado após 30 dias sem pedido de remoção), remoção de inventário, devoluções (voltam ao CD e são reavaliadas), cobertura por região, programa de filiais.

## O que NÃO se aplica ao Indústria 24h (PRDs 036/039/040)
- Tabela pública de tarifas, teste grátis e descontos: o PRD 040 prevê contrato por loja sobre tabela global, sem valores definidos.
- Atendimento ao cliente, reembolso e devolução operados pelo CD: não estão no escopo do 039 (devolução só gera entrada no ledger).
- Selo de entrega rápida/frete grátis, cobertura nacional e múltiplos CDs: o 039 tem um único CD (Manaus) e exclui operação multi-CD.
- Coleta no endereço do seller, programa de filiais, emissor de nota próprio e integradores: fora de escopo (nota de remessa é dependência externa).
- Descarte automático de inventário: o 040 explicitamente não confisca mercadoria de terceiro.
- Lote/validade/FEFO, código de barras, kitagem e embalagem: fora de escopo na v1.
- Comissão de venda: segue a regra de marketplace (5%), separada da fatura de armazenagem.
