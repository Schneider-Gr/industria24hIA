---
prd_number: "041"
status: rascunho
priority: alta
created: 2026-09-17
issue: ""
depends_on: ["037"]
references:
  - "docs/prds/037-comissao-plataforma-por-categoria.md"
  - "https://www.google.com/basepages/producttype/taxonomy-with-ids.pt-BR.txt"
  - "https://api.mercadolibre.com/sites/MLB/domain_discovery/search"
  - "supabase/migrations/0180_comissao_por_categoria.sql"
  - "supabase/migrations/0182_taxonomia_catalogo.sql"
  - "src/app/(admin)/admin/categorias/page.tsx"
  - "src/components/seller/ProdutoForm.tsx"
---

# PRD 041: Taxonomia importável e comissão por nó da árvore

## 1. Contexto

- **Produto/área**: Indústria 24h (marketplace, www.industria24.com.br), catálogo e caminho do dinheiro. A categoria de um produto determina a comissão retida pela plataforma desde o PRD 037.
- **Estado atual**: a taxonomia tem dois níveis fixos, `categorias` e `subcategorias`, sem relação de pai arbitrário. A árvore em produção tem 10 categorias com duplicata ("Fertilizante" duas vezes), eixos sobrepostos ("Legumes e Verduras" irmã de "Supermercado") e lixo de teste. **117 dos 223 produtos estão sem categoria**, o que torna a comissão por categoria do PRD 037 inerte sobre metade do catálogo. A migration 0182 propõe uma árvore autoral de 5 categorias e 22 subcategorias, derivada por inspeção do catálogo que já existe, e não foi aplicada.
- **Problema**: o marketplace está em captação e não sabe quais lojas nem quais produtos vão entrar. Uma taxonomia autorada a partir de 223 produtos de Manaus não prevê o seller seguinte, e cada categoria nova exige uma migration nova. Como a categoria manda na comissão, produto sem categoria é produto com comissão indefinida, e isso é dinheiro, não organização de vitrine.

> Contexto técnico vive no TRD. Ponteiro relevante: a comissão gravada em `linha_itens.repasse_ind_pct` é snapshot no momento do pedido, então mudar percentual nunca reescreve venda passada.

## 2. Solução Proposta

### Visão de produto

- Importar uma taxonomia de mercado pronta e completa, em vez de autorar a própria, para que exista um lugar para o produto de um seller que ainda não chegou.
- Substituir os dois níveis fixos por uma árvore de profundidade livre, onde a comissão configurada num galho vale para tudo abaixo dele até alguém sobrescrever mais fundo.
- Dar ao administrador um botão de importar ao lado do de criar, com prévia que mostra o que vai mudar antes de qualquer gravação, e com a garantia explícita de que nenhuma comissão efetiva muda na importação.
- Manter a criação manual de nós para o vocabulário que nenhuma taxonomia de mercado tem: polpa de fruta regional, jambu, geladinho.
- Trocar os dois campos de seleção do cadastro do seller por uma busca única que resolve para uma folha e mostra o caminho inteiro.

### Decisões de produto

1. **A base é a Google Product Taxonomy em português.** Verificada em 17/09/2026: 5.595 nós, 21 raízes, até 7 níveis, identificadores numéricos estáveis. Descartada a autoria própria porque ela só cobre o catálogo que já existe.
2. **As 21 raízes entram inteiras, sem poda.** Raízes irrelevantes como "Adultos", "Software" e "Mídia" custam linhas numa tabela e ficam invisíveis. Podar obrigaria a uma migration nova a cada seller inesperado, que é exatamente o problema a resolver.
3. **Todo nó nasce sem percentual próprio e herda.** A importação não altera nenhum preço efetivo, porque a raiz continua valendo os 5% padrão do PRD 037.
4. **Só folha pode ser escolhida em produto.** Produto pendurado em galho intermediário gera ambiguidade de comissão.
5. **Nó removido numa revisão futura da taxonomia nunca é apagado se tiver produto**, vira obsoleto e some da busca. Apagar categoria com produto deixa produto sem comissão definida.
6. **A árvore autoral da migration 0182 é descartada**, mas a limpeza de produtos de teste que ela faz é aproveitada.
7. **A comissão continua sendo snapshot no pedido.** Reorganizar a árvore não reescreve venda fechada.

### Fora do escopo

- Classificação automática de produto, sugestão por nome e aprendizado a partir da correção do curador. Vira o PRD 042, que depende desta árvore existir. *(premissa — confirme ou corrija)*
- Produto canônico, identidade comercial obrigatória e atributos por categoria. Vira o PRD 043. *(premissa — confirme ou corrija)*
- Navegador de categorias em colunas no cadastro do seller. Busca mais caminho completo resolve o caso comum; explorar a árvore não é o que o seller quer fazer. *(premissa — confirme ou corrija)*
- Exigência de campos obrigatórios que variam por categoria. *(premissa — confirme ou corrija)*
- Reorganizar a vitrine pública por raízes novas. A vitrine continua exibindo apenas nós com produto ativo. *(premissa — confirme ou corrija)*

## 3. Funcionalidades

### US01: Importar a taxonomia com prévia

Como administradora, quero importar uma taxonomia completa a partir de um arquivo, para que exista uma categoria adequada para produtos de sellers que ainda não entraram.

**Rules:**
- O botão "Importar taxonomia" fica ao lado de "Adicionar categoria", em `/admin/categorias`, e não substitui a criação manual.
- A origem pode ser a Google Product Taxonomy em português, buscada na hora, ou um arquivo enviado pela administradora.
- A versão do arquivo é lida do próprio conteúdo e exibida antes da importação.
- A importação exige uma prévia confirmada. A prévia não grava nada e informa: quantidade de nós no arquivo, quantos são novos, quantos já existem, quantos foram removidos em relação ao que está gravado, quantos nós criados manualmente são preservados, quantas comissões configuradas são preservadas, quantos produtos são afetados e quantas comissões efetivas mudam.
- A importação é atômica: ou todos os nós entram, ou nenhum entra.
- A importação é idempotente pelo identificador de origem do nó, não pelo nome.
- A importação nunca altera percentual de comissão, apelido, visibilidade na vitrine ou disponibilidade para seleção de um nó já existente.
- Todo nó importado nasce sem percentual próprio.
- Cada importação registra versão do arquivo, data, autor e as contagens apuradas.

**Edge cases:**
- Arquivo de origem indisponível ou resposta inválida → informa a falha e oferece o envio manual do arquivo, sem gravar nada.
- Arquivo com formato irreconhecível → recusa antes da prévia, informando a linha problemática.
- Importação da mesma versão já importada → prévia mostra zero nós novos e a confirmação é permitida sem efeito.
- Nó presente na base e ausente no arquivo novo, com produtos vinculados → marcado como obsoleto, mantém os produtos, sai da busca do seller e da vitrine.
- Nó presente na base e ausente no arquivo novo, sem produtos e sem configuração → removido.
- Prévia indicando que alguma comissão efetiva mudaria → a importação é bloqueada e o caso é listado nó a nó. *(premissa — confirme ou corrija)*

### US02: Navegar e administrar a árvore

Como administradora, quero percorrer e filtrar uma árvore de milhares de nós, para configurar apenas os que interessam sem que a página fique inutilizável.

**Rules:**
- A tela exibe a árvore com raízes recolhidas por padrão e expansão sob demanda.
- Há busca por nome que localiza nós em qualquer profundidade e exibe o caminho completo do resultado.
- Há filtro "somente nós com produto", que é o modo de trabalho normal depois da importação.
- Cada nó exibe a contagem de produtos vinculados, incluindo os dos descendentes.
- Um nó pode ser marcado como invisível na vitrine e como não selecionável pelo seller, de forma independente.
- Nó sem produto ativo não aparece na vitrine pública, mesmo visível no admin.
- A administradora pode dar um apelido a um nó importado, e o apelido prevalece sobre o nome de origem em toda exibição.

**Edge cases:**
- Busca sem resultado → oferece criar um nó com aquele nome sob um pai escolhido.
- Exclusão de nó com produtos vinculados → recusada, com a contagem de produtos afetados.
- Exclusão de nó com descendentes → recusada enquanto houver descendente com produto.
- Árvore com mais de mil nós expandidos ao mesmo tempo → a tela lista por página em vez de renderizar tudo. *(premissa — confirme ou corrija)*

### US03: Configurar comissão por nó com herança pelo caminho

Como administradora, quero definir o percentual num galho e valer para tudo abaixo, para não ter que configurar milhares de nós.

**Rules:**
- O percentual de um produto é o do nó mais próximo, subindo o caminho, que tenha percentual próprio.
- Nó sem percentual próprio herda. Nó com percentual zero tem comissão nula deliberada, que é diferente de herdar.
- Não havendo nenhum percentual no caminho inteiro, vale o padrão de 5% do PRD 037.
- A tela mostra, para cada nó, o percentual efetivo e a origem dele: próprio, herdado de qual ancestral, ou padrão.
- Percentual acima de 100% é recusado.
- Alterar percentual vale a partir do próximo pedido e nunca reescreve venda já fechada.
- Mover um nó de pai altera a comissão efetiva dos produtos abaixo dele, e a tela avisa quantos produtos são afetados antes de confirmar.

**Edge cases:**
- Percentual configurado num nó que depois vira obsoleto → continua valendo para os produtos que ficaram nele.
- Produto vinculado a nó que foi movido no meio de um checkout em andamento → o pedido usa o percentual vigente no momento em que a linha foi criada.
- Tentativa de configurar percentual em nó não selecionável → permitida, porque descendentes selecionáveis herdam dele. *(premissa — confirme ou corrija)*

### US04: Criar e enxertar nós próprios

Como administradora, quero criar categorias que a taxonomia importada não tem, para acomodar o vocabulário regional do catálogo.

**Rules:**
- Um nó próprio pode ser criado sob qualquer nó importado ou sob outro nó próprio.
- Nó próprio é identificado como de origem local e nunca é sobrescrito nem removido por importação futura.
- Nó próprio se comporta igual a nó importado em herança de comissão, visibilidade e seleção.
- Pedidos de categoria vindos do cadastro do seller formam uma fila visível nesta tela, com o nome digitado e o produto que motivou o pedido.

**Edge cases:**
- Criação de nó próprio com nome igual a um irmão existente → recusada.
- Pedido de categoria atendido pela criação de um nó → o produto que originou o pedido é vinculado ao nó novo e sai da fila.
- Pedido de categoria recusado → o produto permanece na fila de curadoria com a justificativa. *(premissa — confirme ou corrija)*

### US05: Selecionar categoria no cadastro do produto

Como seller, quero achar a categoria do meu produto digitando uma palavra, para não navegar uma árvore enorme.

**Rules:**
- Os dois campos atuais, Categoria e Subcategoria, são substituídos por um campo único de busca.
- A busca roda no servidor e retorna apenas folhas selecionáveis.
- Cada resultado exibe o caminho completo, porque existem nós homônimos em galhos diferentes.
- Nó marcado como não selecionável nunca aparece para o seller.
- Produto não pode ser publicado sem categoria.
- Quando a busca não encontra nada, o seller pode solicitar uma categoria nova, que entra na fila da curadoria, e o produto segue para curadoria mesmo sem categoria definida.

**Edge cases:**
- Busca com termo que não existe na árvore → oferece o nó mais próximo encontrado e o pedido de categoria nova.
- Seller edita produto cujo nó virou obsoleto → o campo mostra o nó atual marcado como descontinuado e pede a escolha de um substituto.
- Seller edita produto que está na fila de revisão da curadoria → o campo informa o estado em análise e permite correção.
- Busca com acento ou sem acento, ou com erro de digitação simples → retorna os mesmos resultados. *(premissa — confirme ou corrija)*

### US06: Migrar o catálogo atual sem mudar preço

Como administradora, quero que a virada preserve o que já está vendido e configurado, para que nenhum repasse mude por causa de uma reorganização de catálogo.

**Rules:**
- Os vínculos atuais de produto a categoria e subcategoria são preservados na árvore nova.
- As comissões já configuradas nos nós antigos continuam valendo, ligadas ao nó equivalente.
- Nenhuma comissão efetiva de nenhum produto muda em consequência da migração.
- Produtos de teste identificáveis por nome saem da vitrine por recusa de curadoria, sem serem apagados, porque há histórico de venda vinculado.
- Após a migração, um relatório informa quantos produtos ficaram sem categoria.

**Edge cases:**
- Categoria antiga sem equivalente claro na árvore nova → os produtos ficam num nó de destino provisório e entram na fila de revisão. *(premissa — confirme ou corrija)*
- Produto com categoria preenchida e subcategoria vazia → mantido na categoria correspondente até revisão.
- Produto de teste com histórico de venda → recusado na curadoria, jamais apagado.

## 4. Fluxo de Negócio

```
Administradora clica em Importar taxonomia
   |
   v
Escolhe origem (busca online ou arquivo enviado)
   |
   v
Sistema apura a previa, sem gravar nada
   |
   v
Alguma comissao efetiva mudaria?
   |-- sim --> Bloqueia e lista os nos afetados
   |
   |-- nao --> Exibe contagens e aguarda confirmacao
                  |
                  v
             Confirmada?
               |-- nao --> Nada e gravado
               |
               |-- sim --> Grava em transacao unica
                              |
                              v
                        Nos novos nascem sem percentual (herdam 5%)
                        Nos proprios, comissoes e apelidos preservados
                        No ausente com produto -> obsoleto
                        No ausente sem produto e sem config -> removido
                              |
                              v
                        Registra versao, autor, data e contagens
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| A importação de 5.595 nós conclui em transação única | metade de uma árvore importada deixa caminhos quebrados e produtos sem comissão definida | importar e conferir a contagem de nós; forçar erro no meio e conferir que nada foi gravado |
| Nenhuma comissão efetiva muda ao importar | a categoria determina o repasse; import é reorganização, não renegociação de margem | apurar o percentual efetivo de cada produto antes e depois e comparar linha a linha |
| Importar duas vezes a mesma versão não duplica nó nem cria órfão | reimportação vai acontecer a cada revisão da taxonomia | importar duas vezes e conferir a contagem total |
| Comissão, apelido, visibilidade e nós próprios sobrevivem à reimportação | são o trabalho de curadoria da plataforma, não do fornecedor da taxonomia | configurar, reimportar e conferir que persistem |
| Nó ausente na versão nova com produtos vinculados não é apagado | apagar categoria com produto deixa produto sem comissão definida | importar arquivo sem aquele nó e conferir que os produtos seguem vinculados |
| A tela de categorias responde com a árvore importada | com 5.595 nós a tela atual, que renderiza tudo, fica inutilizável | abrir `/admin/categorias` após importar e navegar |
| O percentual efetivo exibido no admin é igual ao aplicado no pedido | divergência entre o que a tela mostra e o que a venda cobra é erro de dinheiro silencioso | configurar um nó intermediário, fechar um pedido de produto descendente e comparar |
| Produto não é publicado sem categoria | produto sem categoria é produto com comissão indefinida | tentar publicar sem categoria |
| Busca do seller retorna apenas folhas selecionáveis | galho intermediário gera ambiguidade de comissão; raízes bloqueadas não podem aparecer | buscar termos que casam com nó intermediário e com nó bloqueado |
| Migração não altera nenhum repasse | é a garantia que permite aplicar em produção sem congelar vendas | comparar percentual efetivo de todos os produtos antes e depois |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Produtos sem categoria | 52,5% (117 de 223, apurado na 0182 em 17/09/2026) | abaixo de 5% | 30 dias após o Milestone 3 | abaixo de 20% | Administradora |
| Categorias criadas manualmente por mês após a importação | não medido hoje, categoria nova exigia migration | menos de 5 | 60 dias | menos de 15 | Administradora |
| Pedidos de categoria nova vindos do seller sem resposta há mais de 7 dias | não existe hoje | zero | contínuo | até 2 | Administradora |
| Divergência entre percentual exibido no admin e cobrado no pedido | zero hoje, por não haver herança | zero | contínuo | zero | Administradora |

## 6. Milestones

### Milestone 1: Importar a taxonomia e administrar a árvore

**Por que é um marco:** a plataforma deixa de ter uma lista de dez nomes feita à mão e passa a ter uma taxonomia de mercado completa, onde cabe o produto de qualquer seller que apareça amanhã. É o que destrava a captação sem depender de uma migration por categoria nova.

**Funcionalidades:** US01, US02, US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] A importação de 5.595 nós conclui em transação única
- [ ] Nenhuma comissão efetiva muda ao importar
- [ ] Importar duas vezes a mesma versão não duplica nó nem cria órfão
- [ ] Comissão, apelido, visibilidade e nós próprios sobrevivem à reimportação
- [ ] Nó ausente na versão nova com produtos vinculados não é apagado
- [ ] A tela de categorias responde com a árvore importada

**Aprovador:** Andreia (dona do produto)

### Milestone 2: Cobrar comissão por galho da árvore

**Por que é um marco:** a plataforma passa a diferenciar margem por tipo de produto configurando dez ou vinte galhos, em vez de subsidiar categoria cara com categoria barata ou reescrever função SQL a cada negociação. É a promessa do PRD 037 funcionando sobre um catálogo que ele antes não alcançava.

**Funcionalidades:** US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] O percentual efetivo exibido no admin é igual ao aplicado no pedido
- [ ] Nenhuma comissão efetiva muda ao importar

**Aprovador:** Andreia (dona do produto)

### Milestone 3: Classificar o catálogo inteiro

**Por que é um marco:** acaba a metade do catálogo sem categoria. Todo produto passa a ter comissão definida por regra, e o seller consegue classificar o que cadastra sem pedir ajuda.

**Funcionalidades:** US05, US06

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Produto não é publicado sem categoria
- [ ] Busca do seller retorna apenas folhas selecionáveis
- [ ] Migração não altera nenhum repasse

**Aprovador:** Andreia (dona do produto)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| A taxonomia importada não cobre vocabulário regional (polpa, jambu, geladinho) | Médio | nós próprios enxertados sob pai importado, com fila de pedidos vinda do seller; verificado em 17/09/2026 que "polpa" não existe na taxonomia do Google | Mitigado por desenho |
| A fonte externa da taxonomia fica indisponível ou fecha o acesso | Médio | envio manual do arquivo como origem alternativa; verificado em 17/09/2026 que o Mercado Livre já fechou com 403 um endpoint de categorias antes público | Mitigado por desenho |
| A tela de categorias, que hoje renderiza tudo de uma vez, fica inutilizável logo após a importação | Alto | árvore recolhida, busca e filtro entram no mesmo marco da importação, nunca depois | Pendente |
| Reorganização de árvore altera comissão sem ninguém perceber | Alto | prévia bloqueia importação que mudaria comissão efetiva; aviso de produtos afetados ao mover nó; snapshot no pedido protege venda passada | Pendente |
| Seller escolhe categoria errada e a comissão sai errada | Médio | apenas folhas selecionáveis, caminho completo visível e curadoria antes da publicação | Pendente |
| O merge em master dispara deploy de produção sozinho neste projeto | Alto | entregar por marcos, com o marco que não muda comportamento primeiro | Monitorando |
| Colisão de número de migration com sessões concorrentes | Médio | verificado em 17/09/2026 que 0183 já está tomado em outra branch e que 0180 já colidiu uma vez; recheca obrigatória imediatamente antes do push | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 037, comissão da plataforma por categoria | Interna | migration 0180 em produção desde 17/09/2026 | sem ele não há onde pendurar percentual; bloqueia o Milestone 2 |
| Destino da migration 0182, não aplicada | Interna | decidido descartar a árvore autoral e aproveitar a limpeza de lixo | se for aplicada antes, o Milestone 3 ganha um passo de desfazer |
| Definição dos percentuais por galho | Externa, decisão de negócio | em aberto | não bloqueia entrega; a árvore nasce inteira a 5% |
| Fila de curadoria de produto já existente | Interna | em produção | US05 e US06 apoiam-se nela para o resíduo sem categoria |

## 8. Referências

- [Google Product Taxonomy em português](https://www.google.com/basepages/producttype/taxonomy-with-ids.pt-BR.txt) — base da árvore importada; verificado em 17/09/2026: versão 2021-09-21, 5.595 nós, 21 raízes, 7 níveis
- [Preditor de categoria do Mercado Livre](https://api.mercadolibre.com/sites/MLB/domain_discovery/search) — não é usado neste PRD, mas é o sinal externo previsto para o PRD 042; verificado público e sem autenticação em 17/09/2026
- `docs/prds/037-comissao-plataforma-por-categoria.md` — define o percentual padrão de 5%, o snapshot no pedido e a tela onde o botão de importar será acrescentado
- `supabase/migrations/0180_comissao_por_categoria.sql` — comissão por nó em dois níveis, em produção
- `supabase/migrations/0182_taxonomia_catalogo.sql` — árvore autoral descartada por este PRD; a limpeza de produtos de teste e as regras de classificação por palavra são aproveitadas
- `src/app/(admin)/admin/categorias/page.tsx` — tela que ganha o botão de importar e precisa virar árvore navegável
- `src/components/seller/ProdutoForm.tsx` — dois campos de seleção substituídos pela busca única

## 9. Registro de Decisões

- **2026-09-17:** Adotar taxonomia de mercado importada em vez de árvore autoral. Motivo: o marketplace está em captação e não sabe quais produtos vão entrar; árvore autorada a partir de 223 produtos não prevê o seller seguinte, e cada categoria nova exigiria uma migration.
- **2026-09-17:** Usar a Google Product Taxonomy em português como base, e não a do Mercado Livre. Motivo: a do Mercado Livre tem vocabulário brasileiro melhor, inclusive polpas de fruta, mas é organizada para navegação de consumidor e sua listagem de raízes deixou de ser pública. A do Google é um arquivo estável, versionado e baixável por inteiro.
- **2026-09-17:** Importar as 21 raízes sem podar. Motivo: podar exigiria uma migration nova a cada seller de segmento inesperado; a invisibilidade resolve com custo de algumas linhas de tabela.
- **2026-09-17:** Todo nó importado nasce sem percentual próprio. Motivo: a importação não pode ser um evento de renegociação de margem; o preço efetivo tem que ficar idêntico antes e depois.
- **2026-09-17:** Comissão herda pelo caminho, do nó mais próximo com percentual próprio. Motivo: configurar 5.595 nós é inviável; configurar dez ou vinte galhos é o trabalho real.
- **2026-09-17:** Apenas folhas são selecionáveis em produto. Motivo: produto pendurado em galho intermediário torna ambíguo qual percentual se aplica.
- **2026-09-17:** Nó ausente numa revisão futura vira obsoleto em vez de ser apagado quando tem produto. Motivo: apagar categoria com produto vinculado deixa produto sem comissão definida.
- **2026-09-17:** Descartar a árvore autoral da migration 0182 e aproveitar dela a limpeza de produtos de teste e as regras de classificação por palavra. Motivo: o trabalho de autoria muda de alvo, não se perde; o lixo em produção continua sendo problema real.
- **2026-09-17:** Separar classificação automática e produto canônico em PRDs próprios. Motivo: ambos entregam valor observável sozinhos e pressupõem esta árvore existir, o que é dependência declarada e não motivo de fusão.
- **2026-09-17:** `depends_on` contém apenas o PRD 037. Motivo: esta feature pressupõe diretamente o percentual padrão, o snapshot no pedido e a tela de categorias definidos lá. Os demais PRDs de catálogo e estoque são do mesmo domínio mas não são pressupostos por nenhuma regra deste documento.
