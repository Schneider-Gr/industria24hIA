<!-- PRD: docs/prds/037-comissao-plataforma-por-categoria.md -->

## Why

A plataforma cobra **5% sobre todo item, sempre**. O número não é configurável em
lugar nenhum: é a constante `round(v_valor_item * 0.05, 2)` escrita dentro do
corpo da RPC `checkout_criar_pedido`. Cinco por cento é margem razoável em
material de construção e é margem errada em hortaliça, onde giro, perda e custo
logístico são outros. Sem diferenciar por tipo de produto, a plataforma subsidia
uma categoria com a outra.

O agravante é operacional: cada negociação de margem hoje exige reescrever uma
função SQL de centenas de linhas, no trecho exato que calcula dinheiro.

Há um segundo problema, descoberto ao medir produção antes de escrever qualquer
código, e ele é maior que o primeiro: **metade do catálogo não tem categoria**.
Comissão por categoria é inerte enquanto 117 dos 223 produtos forem órfãos. Por
isso esta change entrega as duas coisas juntas, a regra e a taxonomia que a
torna aplicável.

## What Changes

- **A comissão vira dado do catálogo.** `categorias.comissao_pct` e
  `subcategorias.comissao_pct`, ambas anuláveis. A precedência é subcategoria,
  categoria, padrão de 5%. `NULL` significa herdar; `0` é valor válido e
  distinto de `NULL`.
- **O percentual aplicado é gravado na venda** (`linha_itens.repasse_ind_pct`),
  para que mudar a tabela amanhã não reescreva o extrato de ontem.
- **O checkout recusa o pedido** quando a comissão da plataforma somada à do
  afiliado passaria de 100% do item, em vez de gravar repasse negativo.
- **A taxonomia é reconstruída**: cinco categorias e dezenove subcategorias
  autoradas a partir do catálogo real, substituindo as dez categorias atuais,
  que têm duplicata (`Fertilizante` duas vezes), eixos sobrepostos (`Legumes` e
  `Verduras` irmãs de `Supermercado`) e lixo em produção (`Teste`).
- **Os 223 produtos são classificados** por nome, em lote, com homologação da
  administradora antes da gravação.
- **`/admin/categorias` ganha a gestão econômica**: campo de percentual por nó,
  herança visível, contagem de produtos e o repasse do seller exibido como
  leitura ao lado.

Fora de escopo, cada um com sua razão:

- **Comissão por produto individual.** Decisão da dona em 17/09: subcategoria é
  grão suficiente. Dois produtos que precisem de percentuais diferentes viram
  subcategorias diferentes.
- **Comissão negociada por loja.** Abre negociação caso a caso e precisa de
  governança própria.
- **Vigência agendada** e **notificação ao seller** na mudança de percentual.
- **Árvore de N níveis.** O schema tem dois níveis, e o motor de cupom casa
  regra por `categoria_id`; trocar o modelo mexeria em cupom e comissão na mesma
  entrega.
- **Recálculo de pedidos antigos.** O snapshot protege o passado; nada é
  reescrito.
- **Perfis de entrega por categoria** (SLA, temperatura, transportadora).

## Capabilities

### New Capabilities
- `comissao-plataforma`: percentual de comissão por nó da taxonomia, com
  herança, snapshot na venda, recusa acima de 100% e gestão no painel admin.

### Modified Capabilities
<!-- `admin-categorias` ganha campos e comportamento econômico, mas nenhum
     requirement existente de CRUD de nome deixa de valer. -->

## Estado real de produção (verificado em `tiwdqgyeyvceaiqqwitc`, 17/09/2026)

| Medida | Valor |
|---|---|
| Categorias | 10 |
| Subcategorias | 9 |
| Produtos | 223 |
| Produtos **sem** categoria | **117**, ou 52% |
| Produtos **sem** subcategoria | 185, ou 83% |
| Lojas | 22 |
| Ocorrências de `0.05` na `checkout_criar_pedido` | **1**, no overload de 3 args |

Três consequências que mudam o dimensionamento:

- **A reescrita da função é pequena.** Os overloads de 4, 5 e 6 argumentos só
  delegam; o corpo real existe uma vez só. A memória do projeto registrava "~20
  migrations e quatro assinaturas", o que descreve o histórico, não o estado.
- **A taxonomia atual não serve de base.** Dez categorias inteiras: Agro
  (Fertilizante duplicado), Combustíveis, Eletrodomésticos, Legumes, Madeira,
  Material de Construção (Cimento, Tijolo), Pet Shop (Ração), Supermercado
  (Alimentos, Congelados, Polpa), Teste, Verduras (hortaliças).
- **O catálogo é estreito e concentrado.** Alvenaria (49 produtos) e folhosas
  (47) valem 43% de tudo, e são exatamente os dois negócios com margem mais
  diferente entre si.

## Classificação simulada (17/09/2026, 100% de cobertura)

| Categoria | Subcategorias | Produtos |
|---|---|---|
| Hortifrúti | Folhosas e verduras (47), Ervas e temperos frescos (31), Regionais e amazônicos (6), Mudas e bandejas (4) | 88 |
| Material de construção | Alvenaria e blocos (49), Madeira (4), Agregados (3), Cimento e argamassa (3), Cobertura, Revestimentos, Hidráulica, Ferro e aço, Tintas (1 cada) | 67 |
| Alimentos e bebidas | Café (24), Panificação (10), Polpas e congelados (10), Sorvetes e geladinhos (6) | 50 |
| Agro | Fertilizantes e defensivos (5), Sementes (5), Estufa e telas (2), Substratos (1) | 13 |
| Pet | Ração (1) | 1 |
| Lixo a excluir | `rascunho` (4), `Teste produto`, cópias (2) | 7 |

⚠ **Casamento por substring classifica errado e em silêncio.** Na primeira
passada, seis produtos de **hortelã** foram para "Estufa e telas", porque
"hortelã" contém "tela". Seriam seis produtos cobrando a comissão de insumo
agrícola sem ninguém perceber. A regra final casa **palavra inteira**, e ainda
assim a classificação entra como sugestão homologada, nunca como escrita direta.

## Sobre a Google Product Taxonomy (verificado 17/09/2026)

A árvore pública em `google.com/basepages/producttype/taxonomy-with-ids.pt-BR.txt`
tem **5.595 nós, 21 raízes e até 7 níveis**. Foi avaliada como árvore-raiz e
**descartada como estrutura**: é forte em Alimentos, Pet e Jardim (`6622
Verduras`, `1876 Padaria`, `1868 Café`, `2802 Sementes`, `113 Fertilizantes`) e
fraca no núcleo B2B deste marketplace, onde só oferece `3031 Tijolos, pedras e
concretos` e `123 Telhado`, sem nó para cimento a granel, milheiro, vergalhão ou
polpa de fruta. É taxonomia de varejo ao consumidor; metade deste catálogo é
atacado em milheiro e fardo.

Fica como **mapeamento opcional**: `google_taxonomy_id` por nó, preenchido onde
existir equivalente, para exportar feed de Shopping e Meta amanhã sem
retrabalho. Não dita a estrutura.

## Impact

- **Banco**: migration `0180`. ⚠ `0179` existe em produção mas **não está em
  master** (branch `fix/estoque-0179-venda-futura-cd`, sem PR). A `0180` é
  gerada a partir do `pg_get_functiondef` **vigente em produção**, portanto já
  carrega 0177 e 0179; publicá-la em master reconcilia a divergência. Rechecar
  colisão de número antes do push, com a mesma regra do job `migrations-lint`.
- **Caminho do dinheiro**: altera `checkout_criar_pedido`. A função **não foi
  transcrita**: foi gerada por script a partir da definição de produção, com
  cinco inserções por âncora única e verificação de ocorrência única por âncora.
- **Comportamento no dia do deploy**: nenhum. A árvore nasce vazia, todo nó
  herda o padrão de 5%, e nenhum preço efetivo muda. A mudança de margem passa a
  ser um ato deliberado na tela.
- **Cupom**: o teto do desconto de plataforma continua sendo `least(v_desc_linha,
  p_repasse_ind)` da `cupom_desconto_item` (0156), que agora varia por
  categoria. Categoria com comissão menor tem menos espaço de desconto. Efeito
  aceito.
- **Repasse ao seller**: derivado desde a 0158 (`valor - repasse_ind -
  repasse_afiliado`). Ajusta-se sozinho, sem tocar `repasses_recalcular_pedido`.
- **Risco de incentivo**: o seller escolhe a categoria do próprio produto. Com
  comissão diferenciada, declarar a categoria mais barata vira economia. Em
  aberto nesta change, e é o que decide se a árvore se degrada de novo.
- **Reversibilidade**: enquanto todos os nós estiverem em `NULL`, a change é
  reversível restaurando a definição anterior da função. Essa janela fecha no
  primeiro percentual salvo.
