## Why

O PRD 049 (Milestone 1) exige que seller e plataforma publiquem transportadoras com tabela de faixas reais a partir do CEP de cada CD. Hoje `/seller/transportadoras` aceita só a planilha de cotação por envio (grava ponto exato de CEP e peso, então o carrinho quase nunca bate), não guarda limites, cubagem, prazo nem taxas, não liga a transportadora a categorias, deixa o seller sobrescrever faixa global e expõe transportadoras próprias ativas de qualquer loja a qualquer usuário (policy `transportadoras_read`). Em produção (24/09/2026): 0 faixas, 2 transportadoras (ambas globais, uma de teste) e 1 de 22 CDs com CEP.

## What Changes

- Cadastro completo da transportadora própria: código de referência, limites de peso, valor e medidas, fator de cubagem, URL de rastreio, nós de categoria com herança; nome único por loja; entra no checkout sem aprovação.
- **BREAKING**: tabela no modo avançado passa a ser de faixas (CEP origem opcional × CEP destino × peso) no formato Bubble ampliado (prazos, AdValorem, KgAdicional, ICMS, Frete Mínimo, Taxa Fixa). A planilha de cotação por envio deixa de ser aceita. Tabela nova substitui a anterior. Faixas sobrepostas bloqueiam o import.
- Modo simples: grade zona × veículo por CD, convertida em faixas de CEP; limites de veículo incoerentes bloqueiam.
- **BREAKING**: remove a sobrescrita de faixa global por loja; quem quer outro preço cadastra transportadora própria.
- Transportadora global: seller ativa informando código de cliente e aceite de contrato; admin marca data de encerramento; admin desativa qualquer transportadora própria, com motivo.
- CD: CEP obrigatório ao salvar (validado), endereço, "aceita retirada" e horários; CDs sem CEP viram pendência.
- Painel de pendências: transportadoras sem faixa, produtos sem peso/medidas, produtos sem transportadora, CDs sem CEP.
- Isolamento: seller não lê nem altera transportadora, faixa, grade ou ativação de outra loja.

Fora desta change (PRD 049 M2 e M3): cálculo no checkout, escolha de CD, gravação do pedido, frete na página do produto, desativação da "Entrega Rápida I24", pós-venda.

## Capabilities

### New Capabilities
- `seller-transportadoras/cadastro-transportadora`: cadastro da transportadora própria, nós de categoria, isolamento por loja e painel de pendências.
- `seller-transportadoras/modo-simples`: grade zona × veículo por CD convertida em faixas de CEP.
- `admin-transportadoras/transportadora-global`: global com ativação por loja (código de cliente e aceite), encerramento por data e desativação de transportadora própria pelo admin.

### Modified Capabilities
- `admin-transportadoras/tabela-frete`: upload passa a ser de faixas reais no formato Bubble ampliado, com validação de sobreposição e substituição da tabela; deixa de converter cotação pontual em faixa.
- `seller-transportadoras/override-tabela-frete`: remove a sobrescrita de faixa global; upload do seller segue o novo formato; visualização da global passa a depender de ativação.
- `seller-centro-distribuicao`: CEP obrigatório e validado, endereço, retirada e horários.

## Impact

- Migrations novas (numeração via `scripts/proximo-migration.sh`): colunas em `transportadoras`, `transportadora_faixas_frete` e `centros_distribuicao`; tabelas `loja_transportadoras`, `transportadora_nos`, `transportadora_grade_simples`, `transportadora_veiculos`, `zonas_cep`; RPC de substituição atômica de tabela; policies de leitura corrigidas.
- `src/lib/transportadoras/`: parser da tabela (formato novo, sobreposição, recusa de cotação), conversor da grade simples; reaproveita `xlsx.ts`, `csv.ts` e o preview em duas etapas da change `transportadoras-tabela-frete-followup`.
- `src/app/(seller)/seller/transportadoras/`, `src/app/(admin)/admin/transportadoras/`, `src/app/(seller)/seller/centros/`: telas e actions.
- `cotar_frete_tabela` e checkout não mudam nesta change; faixas novas só passam a ser usadas no M2. Com 0 faixas em produção, não há dado a migrar.
