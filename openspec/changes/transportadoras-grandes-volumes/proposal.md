## Why

Para carga que não cabe no motoboy (cimento, porcelanato, fardos), o seller precisa oferecer as transportadoras formais com que trabalha e a plataforma precisa oferecer as que negociou. Hoje `/seller/transportadoras` aceita só a planilha de cotação por envio (grava ponto exato de CEP e peso, então o carrinho quase nunca bate), não guarda limites, cubagem, prazo nem taxas, deixa o seller sobrescrever faixa global e expõe transportadora própria ativa de qualquer loja a qualquer usuário (policy `transportadoras_read`). Produção em 25/09/2026: 0 faixas, 2 transportadoras (ambas globais, uma de teste).

Esta change substitui a `frete-tabela-transportadora-cadastro` (#777, Issue #775) depois da revisão da dona em 25/09/2026: a origem do frete é o **CEP do produto** (`produtos.cep_produto`, senão `lojas.cep`), não o CD; e o **freteiro pequeno** (grade zona × veículo) foi para o afiliado logístico (PRD 054). Saem o modo simples, as zonas de CEP e o CEP obrigatório no CD.

## What Changes

- Cadastro completo da transportadora própria: código de referência, limites de peso, valor e medidas, fator de cubagem, URL de rastreio, nós de categoria com herança; nome único por loja; entra sem aprovação.
- **BREAKING**: tabela passa a ser de faixas (CEP origem opcional × CEP destino × peso) no formato Bubble ampliado (prazos, AdValorem, KgAdicional, ICMS, Frete Mínimo, Taxa Fixa). A planilha de cotação por envio é recusada. Tabela nova substitui a anterior numa transação. Faixas sobrepostas bloqueiam.
- **BREAKING**: remove a sobrescrita de faixa global por loja; quem quer outro preço cadastra transportadora própria.
- Global: seller ativa com código de cliente e aceite de contrato; admin marca data de encerramento; admin desativa transportadora própria de qualquer loja, com motivo.
- Painel de pendências: transportadora sem faixa, produto sem peso ou medidas, produto sem transportadora por categoria, produto sem CEP de origem.
- Isolamento: seller não lê nem altera transportadora, faixa, categorias ou ativação de outra loja.

Fora desta change: cálculo no checkout e pedido com o valor exibido (próxima change do PRD 049), pós-venda do envio (M3), modal por API (Melhor Envio / Correios, pesquisa registrada no brainstorm de 25/09), freteiro pequeno (PRD 054).

## Capabilities

### New Capabilities
- `seller-transportadoras/cadastro-transportadora`: cadastro da transportadora própria, categorias, isolamento por loja e painel de pendências.
- `admin-transportadoras/transportadora-global`: global com ativação por loja, encerramento por data e moderação de transportadora própria.

### Modified Capabilities
- `admin-transportadoras/tabela-frete`: upload de faixas reais no formato Bubble ampliado, com validação de sobreposição e substituição; sai a conversão de cotação pontual.
- `seller-transportadoras/override-tabela-frete`: sai a sobrescrita de faixa global; upload do seller no formato novo; global exibida com estado de ativação na loja.

## Impact

- Migration `0199_transportadoras_grandes_volumes.sql`: colunas em `transportadoras` e `transportadora_faixas_frete`; tabelas `loja_transportadoras` e `transportadora_nos`; triggers de moderação, de loja da faixa e de update da faixa; policies de leitura corrigidas; RPC `substituir_faixas_transportadora`.
- `src/lib/transportadoras/`: parser de faixas, leitura da aba "Faixas" do XLSX, validação do cadastro.
- `src/app/(seller)/seller/transportadoras/`, `src/app/(admin)/admin/transportadoras/`, `src/components/admin/UploadTransportadoras.tsx`.
- `cotar_frete_tabela` e checkout não mudam; com 0 faixas em produção, não há dado a migrar.
