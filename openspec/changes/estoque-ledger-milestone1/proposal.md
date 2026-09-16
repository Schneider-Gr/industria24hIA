<!-- PRD: docs/prds/036-ledger-estoque-multi-local.md (Milestone 1: US01 + US06) -->

## Why

O estoque do marketplace inteiro é **um inteiro por produto**,
`produtos.estoque_atual`, decrementado dentro das RPCs de checkout
(`0014_checkout_asaas.sql:206`, `0018:135`, `0019:157`, `0020:159`). Não existe
tabela de movimentação, não existe reserva e não existe registro de onde a
mercadoria está. A única proteção é o `FOR UPDATE` na linha do produto mais o
`CHECK (estoque_atual >= 0)`, ambos introduzidos em
`0022_fix_checkout_race_estoque.sql`.

Três consequências, todas em produção hoje:

- **Nenhuma auditoria.** Quando o seller diz que o saldo está errado, não há
  como reconstruir o que aconteceu. O saldo é um número que alguém sobrescreveu.
- **Saldo destruído na baixa.** `src/app/checkout/actions.ts:171` cria um pedido
  por loja em loop **sem rollback**. Se a segunda loja falha, a primeira já
  baixou estoque e não há registro para devolver.
- **Sem posição física.** O marketplace não sabe de onde o produto sai, o que
  impede prometer prazo por origem e impede qualquer serviço de armazenagem.

O terceiro item é o que trava a decisão de negócio de 16/09: o Indústria 24h vai
oferecer **armazenagem aos sellers**, com piloto em Manaus. Guardar mercadoria de
terceiro sem histórico auditável transforma divergência de saldo em dívida com o
seller. O ledger é pré-requisito, e tem valor próprio mesmo se o CD não sair do
papel, porque é ele que torna possível consertar os dois primeiros itens.

Esta change entrega **apenas o Milestone 1**: ligar o livro de movimentações e
migrar o saldo atual, **sem tocar no checkout**. A troca de baixa por reserva é o
Milestone 2, em change própria, justamente para que o caminho do dinheiro não
mude na mesma entrega em que o modelo de dados muda.

## What Changes

- **Livro de movimentações** (`estoque_movimentos`): todo lançamento carrega
  produto, local, quantidade com sinal, tipo, motivo, autor e data. Linha
  gravada é imutável: sem UPDATE, sem DELETE, garantido por regra no banco e não
  por convenção. Correção se faz com lançamento contrário.
- **Local de estoque reusa `centros_distribuicao`**, que já existe desde
  `0002_seller_module.sql:43`, junto com o N:N `produto_centros` (`0002:84`) e a
  origem do item de pedido em `linha_itens.centro_id` (`0005:28`, coluna no bloco
  de `linha_itens`, **não** em `pedidos`). A tabela ganha `tipo` (`seller` ou
  `industria`) e marcação de padrão; **nenhuma entidade paralela de local é
  criada**. Nesta change o seller ainda não escolhe origem pela interface, isso é
  o Milestone 3 — o que muda é que o centro passa a ter saldo. A origem já ser
  por **item**, e não por pedido, é o que torna viável o atendimento a partir de
  mais de um local previsto na US03.
- **`produtos.estoque_atual` vira saldo derivado.** A coluna continua existindo,
  continua correta e continua sendo lida pelas 124 referências espalhadas pelo
  código e pelas migrations. Passa a ser mantida pelo ledger em vez de escrita à
  mão. Nenhum consumidor precisa mudar.
- **Migração do saldo atual** com paridade exigida: cada produto com saldo maior
  que zero recebe um lançamento inicial de entrada, e a verificação pós-migração
  precisa devolver **zero linhas divergentes** entre o saldo calculado e o
  `estoque_atual` anterior. Produto já vinculado a um único centro em
  `produto_centros` tem o saldo migrado para aquele centro; os demais vão para o
  local padrão da loja.
- **Edição de estoque do seller vira ajuste com motivo.** O campo numérico em
  `src/components/seller/ProdutoForm.tsx:189` continua na tela, com o mesmo
  formato, mas salvar passa a gravar um lançamento de ajuste com motivo
  obrigatório em vez de sobrescrever a coluna
  (`src/app/(seller)/seller/produtos/actions.ts:54,61,79,204`).

Fora de escopo, cada um com sua razão:

- **Reserva e troca da baixa no checkout** (Milestone 2). O checkout continua
  baixando direto de `estoque_atual` nesta change; o ledger apenas reflete o que
  ele faz. Separado para que a mudança do modelo de dados e a mudança do caminho
  do dinheiro não viajem juntas.
- **Cadastro de local pelo seller, transferência entre locais e extrato na tela**
  (Milestone 3, US03/US04/US05).
- **CEP estruturado em `centros_distribuicao`** (Milestone 3). Aqui o local
  padrão não precisa de CEP porque ninguém ainda escolhe origem por distância.
- **Lote e validade** (PRD 010, perecíveis).
- **Aviso de recebimento, conferência e inventário cíclico** (Fase 3).

## Capabilities

### New Capabilities
- `estoque-ledger`: livro de movimentações imutável como fonte da verdade do
  saldo, centro de distribuição como dono do saldo, `produtos.estoque_atual`
  como saldo derivado, ajuste do seller com motivo obrigatório e migração do
  saldo existente com paridade verificada.

### Modified Capabilities
<!-- Nenhuma. `seller-produtos` não muda de contrato: o requirement "CRUD de
     produto restrito à própria loja" continua valendo palavra por palavra, e
     "Edição inline de estoque mínimo" trata de `quantidade_minima`, não de
     saldo. O novo comportamento ao salvar a quantidade é definido pelo
     requirement "Ajuste de estoque pelo seller com motivo obrigatório" da
     capability nova. `seller-centro-distribuicao` ganha campos, mas nenhum
     comportamento descrito na sua spec deixa de valer. -->

### Marcos posteriores (fora desta change)
- Milestone 2: reserva no pedido e baixa na expedição (US02).
- Milestone 3: cadastro de local pelo seller com CEP, transferência e extrato
  (US03, US04, US05).

## Estado real de produção (verificado em `tiwdqgyeyvceaiqqwitc`, 16/09/2026)

Levantado com `supabase db query --linked` antes de escrever a migration. Números
que mudam o dimensionamento desta change:

| Medida | Valor |
|---|---|
| Produtos | 206, sendo **126 com saldo** maior que zero |
| Soma do estoque | 71.209 unidades |
| Lojas | 21 |
| Centros de distribuição cadastrados | **4**, em 4 lojas distintas |
| Vínculos em `produto_centros` | 30, todos de produto com **um único** centro |
| Produtos com mais de um centro | **0** |
| `linha_itens` com `centro_id` preenchido | 4 |

Três consequências diretas:

- **17 das 21 lojas não têm nenhum centro.** A migração cria local padrão para
  elas, e esse é o caso majoritário, não a exceção. 176 dos 206 produtos caem no
  local padrão da loja.
- **A tarefa 3.3 perde o risco que tinha.** Nenhum produto está vinculado a
  vários centros hoje, então a regra de rateio não precisa ser decidida agora,
  só precisa existir como recusa explícita caso apareça.
- **Nenhum centro em Manaus.** Os quatro são Rio Branco/AC (dois), Porto
  Alegre/RS e um endereço de Nova York que é claramente dado de teste. O piloto
  de Manaus previsto no PRD 036 começa com zero centros cadastrados, o que é
  informação de captação, não de engenharia.

**A tela `/seller/centros` foi conferida logada em 16/09.** O formulário tem
exatamente dois campos, `Nome` e `Localização` (texto livre com o placeholder
`"Ex.: Manaus, Rua Marapatá"`), mais o botão de ajuda contextual do campo. Não há
CEP, não há tipo de centro, não há marcação de padrão e não há nada de
capacidade ou saldo: hoje o centro é um **rótulo**, não um local de estoque. A
listagem abaixo do formulário mostra nome, localização, status e data. É
exatamente o conjunto de campos que esta change e o Milestone 3 precisam
estender.

⚠ **`centros_distribuicao.localizacao` não é texto livre em produção.** Três dos
quatro registros contêm **JSON com `address`, `lat` e `lng`** (origem Bubble, com
geocode do Google), e o quarto contém texto puro. O formulário atual
(`src/components/seller/CentroForm.tsx:26`) é um `<input>` de texto simples com
placeholder `"Ex.: Manaus, Rua Marapatá"`: quem cadastra pelo painel novo **perde
o geocode** que o legado tinha. Isso não bloqueia esta change, que não lê
localização, mas antecipa o Milestone 3: as coordenadas necessárias para escolher
origem por distância **já existem** para parte da base, e a tela atual as está
degradando. Tratar como bug próprio, fora desta change.

## Impact

- **Banco**: migration nova. ⚠ O maior número em **todas as branches** é `0172`
  (guarda de cupom, não aplicada em produção) — a local mostra apenas até `0148`.
  A próxima livre é `0175`, e a checagem de colisão deve ser refeita **antes do
  push**, não só na criação: `cd supabase/migrations && ls | grep -oE '^[0-9]{4}'
  | sort | uniq -d` precisa sair vazio, que é a mesma regra do job
  `migrations-lint` no CI.
- **Caminho do dinheiro**: esta change **não altera** `checkout_criar_pedido`. O
  trigger que mantém `estoque_atual` derivado, porém, dispara nas escritas feitas
  por ela. Testar a migration inteira em `begin; ... select <verificações>;
  rollback;` via `supabase db query --linked` antes de aplicar, e conferir
  explicitamente que uma compra simulada continua produzindo o mesmo
  `estoque_atual` de antes.
  ⚠ A definição corrente de `checkout_criar_pedido` no checkout local está em
  `0140_checkout_cotacao_uber_direct.sql`, mas há migrations `0149`–`0172` em
  outras branches que podem redefini-la. Reler a definição vigente em produção
  com `db query --linked` antes de escrever o trigger.
- **RLS**: `estoque_movimentos` e `estoque_locais` nascem com RLS ativa. Seller
  lê apenas lançamentos das lojas dele; escrita direta pelo cliente é proibida,
  só por função `security definer`. Sem isso o ledger vira vazamento de dado de
  concorrente entre sellers do mesmo marketplace.
- **UI**: `src/components/seller/ProdutoForm.tsx` ganha o campo de motivo do
  ajuste; `src/app/(seller)/seller/produtos/actions.ts` troca a escrita direta
  pela chamada da função de ajuste. Nenhuma tela nova nesta change.
- **Performance**: o saldo passa a ser derivado. Se for calculado por soma a cada
  leitura, a vitrine paga o custo em toda listagem. O saldo é **materializado**
  em `estoque_atual` e em saldo por local, com o ledger como origem, não
  recalculado sob demanda.
- **Reversibilidade**: enquanto o checkout não usa o ledger, a change é
  reversível removendo o trigger e as duas tabelas, sem perda do saldo, que
  continua vivo em `estoque_atual`. Essa janela fecha no Milestone 2.
