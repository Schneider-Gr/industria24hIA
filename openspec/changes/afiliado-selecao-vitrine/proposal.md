## Why

Hoje, virar afiliado de um produto exige login *antes* de sequer poder escolher o quê divulgar: toda a área `/afiliado` (incluindo `/afiliado/solicitar`, onde a lista de produtos elegíveis aparece) fica atrás de `PrecisaLogin` no layout. Um visitante navegando a vitrine pública que se interessa por divulgar um produto tem que interromper a navegação, criar conta, e só depois voltar para escolher — sem conseguir montar uma seleção antes disso.

O padrão já existente no site pra esse tipo de fricção é o carrinho: seleção acontece livre, anônima, em `localStorage`, e o login só é cobrado no momento de efetivar (checkout). Este change aplica o mesmo padrão à afiliação de produtos, e adiciona uma capacidade nova que hoje não existe: divulgar vários produtos com um único link, via uma página de vitrine curada montada pelo próprio afiliado.

## What Changes

- Produtos com `permite_afiliacao = true` ganham um checkbox de seleção no card da vitrine pública (grid de produtos), visível a qualquer visitante, logado ou não.
- O menu do header que hoje mostra "Entrar" (área de conta) passa a exibir também um contador de itens selecionados para afiliação — reaproveita o menu existente, não cria um ícone novo.
- Botão "Afiliar selecionados" dispara o fluxo de login já existente quando o visitante não está autenticado; a seleção sobrevive ao login (mesmo mecanismo client-side do carrinho).
- Após login, abre uma tela de revisão do lote: lista os produtos selecionados, sinaliza os que já têm afiliação existente do mesmo usuário (`Pendente` ou `Aprovada`) sem permitir reenvio duplicado, e pede um único aceite de termos cobrindo o lote inteiro.
- Confirmar a revisão cria uma linha em `afiliacoes` (status `Pendente`) para cada produto do lote que ainda não tinha afiliação — mesma lógica de derivação de `loja_id`/`porcentagem_afiliado`/`identificador` já usada em `solicitarAfiliacao`, agora em lote.
- **Nova capacidade:** dentro do painel do afiliado, é possível nomear uma coleção com produtos já afiliados (do lote recém-criado ou de afiliações anteriores) e gerar uma página de vitrine curada pública com uma única URL de divulgação. Cada produto dentro dessa página usa o `?ref=` individual que já existe hoje (mecanismo de `CapturaRef`/cookie `afiliado_ref` inalterado) — a página é só uma camada de apresentação/agrupamento, não um novo identificador de rastreamento.

## Capabilities

### New Capabilities
- `afiliado-selecao-lote`: seleção múltipla de produtos na vitrine pública sem login, pré-painel no menu do header, e efetivação em lote das afiliações após autenticação, com tela de revisão e aceite único de termos.
- `afiliado-vitrine-curada`: montagem de uma coleção nomeada de produtos já afiliados e publicação de uma página de vitrine pública com link único de divulgação, reaproveitando o rastreamento por `?ref=` já existente por produto.

### Modified Capabilities
(nenhuma — a moderação de afiliações pelo seller, coberta por `seller-afiliados`, continua item a item; este change não altera esse fluxo)

## Impact

- `src/components/vitrine/*` (cards de produto na listagem pública): novo checkbox condicionado a `produto.permite_afiliacao`, mais estado de seleção.
- Header/menu de conta (componente ainda a identificar no código — hoje mostra "Entrar"/e-mail do usuário): novo contador de itens selecionados.
- Novo estado client-side (localStorage) para a seleção anônima, seguindo o padrão de `src/components/carrinho/carrinho.tsx`.
- `src/app/(afiliado)/afiliado/actions.ts`: nova Server Action de efetivação em lote, reaproveitando a lógica de derivação de `solicitarAfiliacao` (linhas 36-92) em vez de duplicá-la.
- Nova rota pública para a página de vitrine curada (ex.: `/afiliado/vitrine/[slug]` — nome final a definir na implementação) e uma tabela nova para armazenar a coleção (nome, afiliado_id, lista de produto_id) — **não existe hoje no schema**, este é schema novo, não reaproveitado.
- Não altera `CapturaRef`, o cookie `afiliado_ref`, nem a lógica de resolução de comissão no checkout — o link único é só uma página de listagem, cada produto dentro dela mantém seu identificador individual.
- Não altera `seller-afiliados` (moderação pelo seller continua por afiliação individual, uma a uma).

## Repasse e percentuais (revisado)

- `porcentagem_afiliado` continua sendo derivado do produto no momento da criação/efetivação de cada afiliação — nunca um valor único aplicado ao lote ou à coleção inteira. Isso já valia no fluxo individual (`solicitarAfiliacao`) e passa a ser um requisito explícito também no lote e na coleção (ver specs).
- O cálculo do repasse ao afiliado (`repasses_recalcular_pedido`, migration 0111) **já roda automaticamente** hoje, gerando a linha em `repasses` com `destino = 'afiliado'`, `loja_id` e o valor correto — isso não muda neste change, e os dois specs agora têm requirements/scenarios explícitos garantindo que afiliações criadas em lote e vendas originadas na coleção alimentem esse mesmo cálculo sem caminho paralelo.
- **D-E4.1 (decisão confirmada 2026-08-13, reafirma o revert de 2026-08-03 em `docs/e4-split-repasse-bpmn.md`): o repasse ao afiliado NÃO passa pela plataforma.** É o lojista quem paga o afiliado, fora da Indústria24h — não há transferência PIX automática nem chave PIX de afiliado no schema, e este change não introduz nenhuma das duas. O papel da plataforma se limita a manter `repasses`/`linha_itens.repasse_afiliado` corretos para que o lojista saiba quanto deve.
- Consequência direta para este change: as afiliações criadas em lote e as vendas originadas na vitrine curada **precisam aparecer no painel do seller do mesmo jeito que uma afiliação individual já aparece hoje** (`seller/pedidos` — repasse visível ao lojista, já em produção). Nenhuma UI nova de repasse é criada; a garantia aqui é de que o novo caminho de criação de afiliação não puxa dados por fora dessa visão já existente.

## Assumptions (a validar)

- **Duplicidade no lote:** ao revisar, um produto já afiliado pelo mesmo usuário fica **visível com o status atual e bloqueado para reenvio**, em vez de ser removido silenciosamente da lista — decisão tomada por inferência (o usuário confirmou "avisa" sem detalhar qual dos dois comportamentos; optei pelo mais transparente, alinhado ao padrão de erro explícito já usado em `solicitarAfiliacaoLoja`). Ajustar se a intenção era outra.
- **Persistência da seleção anônima:** client-side (`localStorage`), efêmera, sem tabela no banco antes do login — por analogia direta ao carrinho. Não foi perguntado explicitamente; se a intenção é a seleção sobreviver a troca de dispositivo antes do login, isso muda a arquitetura (precisaria de sessão anônima persistida no servidor).
