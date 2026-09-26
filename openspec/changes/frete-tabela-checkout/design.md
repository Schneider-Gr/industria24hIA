## Context

Motivação em proposal.md. Estado verificado no código do master (`02d762b9`) e em produção (`tiwdqgyeyvceaiqqwitc`) em 25/09/2026:

- O carrinho já vira um pedido por loja (`checkout/actions.ts`), e cada pedido tem uma transportadora só (`v_transportadora` em `checkout_criar_pedido(itens, entrega, forma_pagamento)`, a versão com o corpo; os overloads de 4, 5 e 6 argumentos só a embrulham). `linha_itens.transportadora_id` e `linha_itens.valor_frete` já são por linha.
- `cotar-frete/route.ts` chama `cotar_frete_tabela(loja, cep, peso)` (0148), que devolve uma linha; depois `cotar_frete_interno` (%) e, sem ele, Uber Direct (`fonte = 'uber_direct'`, cotação gravada em `cotacoes_frete_externo`). O pedido recalcula a tabela com peso 0.
- O overload `frete_consolidado` aplica 70% sobre `valor_frete` de todas as linhas do pedido.
- `produtos`: `peso` (kg, rótulo do formulário), `altura`, `largura`, `comprimento` (cm), `cep_produto` (texto, formatos mistos). Os 127 aprovados têm os quatro campos preenchidos, mas há unidade errada: "Geladinho Yupi Fardo" com 12.400 kg (parece gramas) e "Tijolo cerâmico 6 furos" com 0,2 × 0,4 × 0,6 cm (parece metros).
- 0199: `transportadoras` com limites, `fator_cubagem`, `desativada_por_admin`, `encerra_em`; `transportadora_faixas_frete` com origem opcional, prazos, `ad_valorem`, `kg_adicional`, `icms`, `frete_minimo`, `taxa_fixa`; `loja_transportadoras` (ativação de global); `transportadora_nos` (categorias com herança por `taxonomia_nos.parent_id`).
- `lojas` não tem campo de dias para postar. Não existe mecanismo de feature flag no projeto (`marketplace_config` só guarda banners).
- Em produção: 0 faixas; globais = "Entrega Rápida I24" (teste) e Uber Direct.

## Goals / Non-Goals

**Goals:** o comprador de loja com a flag vê as transportadoras reais de cada envio, com valor e prazo, e paga exatamente o valor recalculado pela plataforma; loja sem a flag não muda em nada.

**Non-Goals:** pós-venda do envio (M3), frete na página do produto (US13), "Entrega a combinar" (PRD 050), frete no repasse (PRD 052), escolha de CD, empacotamento em caixa, cotação por API.

## Decisions

**D1. Motor no banco, fonte única.** RPC `cotar_envios_tabela(p_loja_id uuid, p_cep_destino int, p_itens jsonb)` (`security definer`, `search_path = public, pg_temp`, `stable`), com `p_itens = [{produto_id, quantidade}]`. Lê peso, medidas, valor (`preco_faixa`), categoria e origem do cadastro, nunca do navegador. Devolve uma linha por envio × transportadora: `envio_ref, cep_origem, produto_ids uuid[], transportadora_id, nome, valor, prazo_min, prazo_max`. A rota de cotação e `checkout_criar_pedido` chamam a mesma função, então o valor exibido e o gravado não divergem. Descartado: calcular em TypeScript e repetir em SQL, porque duas implementações da fórmula divergem.

**D2. Origem = CEP do produto normalizado** (D10 da change anterior): só dígitos; 7 dígitos ganham zero à esquerda; 8 dígitos valem; o resto e a falta caem em `lojas.cep`. Implementado também em SQL (`cep_origem_produto(produto_id)`), com os mesmos casos do teste de `src/lib/transportadoras/`.

**D3. Envios.** Os itens da loja se agrupam por CEP de origem. Em cada grupo, uma transportadora é candidata ao item quando: está ativa, não desativada pelo admin, não encerrada (`encerra_em > current_date` ou nulo), é própria da loja ou global com `loja_transportadoras.ativo`; leva a categoria do produto (nó marcado ou ancestral; sem nó marcado = leva tudo); e cada medida do produto cabe nos máximos. Itens com o mesmo conjunto de candidatas formam um envio; se alguma transportadora é candidata de todos os itens do grupo, o grupo é um envio só (decisão 7 do PRD). Para cada envio e transportadora: peso real = Σ peso × qtd; peso cubado = Σ (A × L × C × qtd) ÷ `fator_cubagem` (sem fator, peso cubado = 0); peso cobrado = maior dos dois; valor dos produtos dentro de `valor_min`/`valor_max` e peso cobrado dentro de `peso_min`/`peso_max`; e existe faixa ativa com origem (ou origem vazia), destino e peso cobrado. Transportadora que falha só nos limites do envio sai daquele envio. `envio_ref` = `md5(cep_origem || produto_ids ordenados)`, estável entre cotação e pedido.

**D4. Fórmula** (decisão 10 do PRD 049): faixa que contém o peso cobrado; acima da maior faixa, maior faixa + `kg_adicional` × (peso cobrado − `peso_max` da maior faixa), e sem `kg_adicional` a transportadora não é oferecida. Subtotal = valor + excedente + `ad_valorem`% × valor dos produtos + `taxa_fixa`; aplica `greatest(subtotal, frete_minimo)`; ICMS por dentro: ÷ (1 − `icms`/100); arredonda em centavos no fim. Mais de uma faixa atendendo (dado anterior à validação de sobreposição) → a de menor valor.

**D5. Cadeia de fontes por envio.** Loja com flag e com ao menos uma transportadora de tabela ativa: só tabela; envio sem opção → "Entrega a combinar" (PRD 050); até o PRD 050, esse envio deixa a loja só com retirada. Loja com flag e sem transportadora de tabela ativa, ou loja sem flag: caminho de hoje (% e Uber Direct), sem mudança. A entrega por km do afiliado (PRD 053/054) segue como opção paralela, fora desta cadeia.

**D6. Pedido.** `entrega` ganha `envios: [{envio_ref, transportadora_id}]` para loja com flag. `checkout_criar_pedido` chama `cotar_envios_tabela` com os itens do pedido e, para cada envio, exige que a transportadora escolhida esteja entre as opções recalculadas; senão levanta `'O frete mudou. Revise as opções de entrega.'` e o checkout recota. Cada envio precisa de uma escolha; `v_frete` = soma dos envios; o frete do envio é rateado pelas linhas do envio pelo valor do item, com o resto na última linha do envio. Grava `linha_itens.transportadora_id`, `valor_frete`, `envio_ref`, `frete_prazo_min`, `frete_prazo_max`. Loja sem flag passa pelo corpo atual sem alteração de comportamento.

**D7. Frete consolidado** não mexe em linha com `envio_ref` preenchido (frete de tabela); o checkout esconde a opção quando todos os envios da loja são de tabela. Motivo: o seller paga à transportadora o preço cheio.

**D8. Prazo.** `lojas.dias_para_postar smallint not null default 1 check (between 0 and 30)`, editável em Minha Loja. Prazo exibido e gravado = `dias_para_postar` + prazo da faixa; faixa sem prazo → "prazo a combinar".

**D9. Flag.** `lojas.frete_tabela_checkout boolean not null default false`; o ramo `lojas` de `guard_campos_restritos` (trigger `guard_lojas_moderacao`, 0012; estender a versão vigente em produção) impede o seller de alterá-la; o admin liga na tela de lojas. Motivo: validar com uma loja de teste em produção sem expor o comprador antes do M3, do PRD 052 e do PRD 050.

**D10. Apresentação em TypeScript.** `src/lib/checkout/opcoes-frete.ts` ganha a montagem por envio a partir das linhas da RPC: ordena por valor, pré-seleciona a mais barata, marca "mais rápida" a de menor `prazo_max` (empate: menor valor), mantém a escolha anterior se ela continua disponível e avisa quando ela sumiu. Testado com Vitest.

**D11. "Entrega Rápida I24"** fica `ativo = false` na migration, só se não houver `linha_itens` com ela (decisão 16).

## Risks / Trade-offs

- [Unidade errada no cadastro (kg × g, cm × m)] → frete absurdo ou transportadora escondida. Mitigação: antes de ligar a flag de uma loja, conferir os produtos dela; aviso no cadastro fica para o PRD 051.
- [Envios demais por carrinho] → mostrar os produtos de cada envio; preferir envio único (D3).
- [RPC pesada no checkout] → roda por loja do carrinho, com itens do carrinho; índices de 0145/0199 em faixas por transportadora.
- [Corpo novo de `checkout_criar_pedido` quebra o caminho de hoje] → teste em `begin … rollback` contra produção com loja sem flag (percentual, Uber Direct, cupom, consolidado, venda futura) antes de aplicar; o ramo novo só roda com a flag.
- [Flag ligada antes do M3] → pedido por transportadora de tabela não tem a entrega confirmada e o repasse trava. Só o admin liga; a tela avisa que é teste.

## Migration Plan

1. Número pelo `scripts/proximo-migration.sh`; `--checar` de novo antes do push.
2. Teste em `begin … rollback` contra produção: casos numéricos do PRD 049 (R$ 42,00; R$ 47,73; R$ 15,00; R$ 180,00; sem kg adicional; medida acima do limite; carrinho misto 2 envios × 1 envio; global não ativada não aparece; encerrada não aparece) e regressão do caminho sem flag.
3. Aplicar com a confirmação da dona antes do merge (preview e produção usam o mesmo banco).
4. Rollback: colunas aditivas; recriar `checkout_criar_pedido` pela definição da 0189.
