## Purpose

Define o comportamento observável da seleção múltipla de produtos para afiliação na vitrine pública: o visitante marca produtos sem precisar estar logado, acompanha a seleção num pré-painel, e só é obrigado a autenticar no momento de efetivar o lote — nunca antes.

## ADDED Requirements

### Requirement: Seleção de produto sem autenticação
O sistema SHALL permitir que qualquer visitante, autenticado ou não, marque produtos com `permite_afiliacao = true` para afiliação diretamente no card do produto na vitrine pública.

#### Scenario: Visitante anônimo marca um produto
- **WHEN** um visitante sem sessão ativa marca o checkbox de afiliação em um produto elegível na vitrine
- **THEN** o produto entra na seleção sem exigir login, redirecionamento ou qualquer interrupção da navegação

#### Scenario: Produto sem afiliação habilitada
- **WHEN** um produto tem `permite_afiliacao = false`
- **THEN** o checkbox de seleção não é exibido no card desse produto

### Requirement: Pré-painel de seleção no menu existente
O sistema SHALL exibir a contagem de produtos selecionados no menu de conta já existente no header, sem introduzir um novo ícone.

#### Scenario: Contador atualiza ao selecionar
- **WHEN** o visitante marca ou desmarca um produto na vitrine
- **THEN** o contador de itens selecionados no menu do header reflete a mudança imediatamente, sem recarregar a página

### Requirement: Persistência da seleção anônima
O sistema SHALL manter a seleção de produtos no dispositivo do visitante (armazenamento local do navegador) até que o lote seja efetivado ou explicitamente esvaziado, sobrevivendo à navegação entre páginas e ao fluxo de login.

#### Scenario: Seleção sobrevive à navegação
- **WHEN** o visitante seleciona produtos, navega para outras páginas da vitrine e retorna
- **THEN** a seleção anterior continua presente e visível no pré-painel

#### Scenario: Seleção sobrevive ao login
- **WHEN** o visitante com produtos selecionados aciona "Afiliar selecionados" e completa o login
- **THEN** a seleção feita antes do login chega intacta à tela de revisão pós-login

### Requirement: Efetivação exige autenticação
O sistema SHALL exigir que o visitante esteja autenticado antes de efetivar qualquer afiliação do lote selecionado.

#### Scenario: Visitante não autenticado tenta efetivar
- **WHEN** um visitante sem sessão ativa aciona "Afiliar selecionados"
- **THEN** o sistema interrompe o fluxo e solicita login antes de prosseguir para a revisão do lote

### Requirement: Tela de revisão pós-login
O sistema SHALL exibir, após a autenticação, uma tela de revisão do lote selecionado antes de criar qualquer afiliação, permitindo remover itens e mostrando o status de itens já afiliados anteriormente pelo mesmo usuário.

#### Scenario: Item já afiliado pelo mesmo usuário
- **WHEN** a tela de revisão inclui um produto para o qual o usuário autenticado já possui uma afiliação com status `Pendente` ou `Aprovada`
- **THEN** o sistema exibe esse item com o status atual da afiliação existente e impede que ele seja reenviado como uma nova solicitação

#### Scenario: Usuário remove um item da revisão
- **WHEN** o usuário remove um produto da tela de revisão antes de confirmar
- **THEN** esse produto não gera afiliação e some da seleção

### Requirement: Aceite único de termos para o lote
O sistema SHALL exigir um único aceite dos Termos do Afiliado de Vendas na tela de revisão, aplicado a todas as afiliações criadas naquela confirmação.

#### Scenario: Confirmação sem aceite
- **WHEN** o usuário tenta confirmar o lote sem marcar o aceite dos termos
- **THEN** o sistema bloqueia a confirmação e não cria nenhuma afiliação

### Requirement: Criação em lote das afiliações
O sistema SHALL criar uma afiliação com status `Pendente` para cada produto do lote confirmado que ainda não possuía afiliação do usuário, derivando `loja_id` e `porcentagem_afiliado` do próprio produto, e registrando o mesmo aceite de termos em cada linha criada.

#### Scenario: Confirmação do lote com múltiplos produtos novos
- **WHEN** o usuário confirma a revisão de um lote com 5 produtos, nenhum deles previamente afiliado
- **THEN** o sistema cria 5 novas afiliações com status `Pendente`, cada uma com seu próprio identificador de divulgação, `loja_id` e `porcentagem_afiliado` corretos para o respectivo produto

#### Scenario: Lote misto com itens já afiliados
- **WHEN** o usuário confirma a revisão de um lote onde 3 produtos são novos e 2 já têm afiliação existente
- **THEN** o sistema cria afiliação apenas para os 3 produtos novos, sem duplicar ou alterar as 2 afiliações já existentes

### Requirement: Percentual de comissão exibido por produto, nunca uniforme
O sistema SHALL exibir, na tela de revisão, o `porcentagem_afiliado` real de cada produto do lote individualmente, mesmo quando os produtos do lote pertencem a lojas diferentes com percentuais diferentes. O sistema SHALL NOT assumir ou aplicar um percentual único para todos os itens do lote.

#### Scenario: Lote com percentuais diferentes entre produtos
- **WHEN** o lote contém um produto com `porcentagem_afiliado = 5` e outro com `porcentagem_afiliado = 12`
- **THEN** a tela de revisão exibe os dois percentuais corretamente, um por produto, e cada afiliação criada grava o percentual do seu próprio produto

#### Scenario: Percentual do produto muda entre a seleção e a efetivação
- **WHEN** o seller altera `porcentagem_afiliado` de um produto depois que ele foi selecionado na vitrine mas antes da efetivação do lote
- **THEN** a afiliação criada usa o `porcentagem_afiliado` vigente no momento da efetivação, não o valor exibido no momento da seleção

### Requirement: Ledger de repasse íntegro para afiliações criadas em lote
O sistema SHALL garantir que toda venda futura atribuída a uma afiliação criada por este fluxo alimente o cálculo de repasse ao afiliado (`repasses_recalcular_pedido`, migration 0111) da mesma forma que uma afiliação criada pelo fluxo individual existente — sem campo novo, sem tabela paralela, sem caminho de atribuição diferente.

#### Scenario: Venda por afiliação criada em lote gera repasse pendente
- **WHEN** um pedido é confirmado com `linha_itens.afiliado_id` apontando para uma afiliação criada por este fluxo
- **THEN** o repasse correspondente aparece em `repasses` com `destino = 'afiliado'` e o valor correto, do mesmo jeito que aparece para uma afiliação criada pelo fluxo individual

### Requirement: Repasse ao afiliado visível ao lojista, não à plataforma
O sistema SHALL manter o repasse ao afiliado (D-E4.1, decisão confirmada: o lojista paga o afiliado, fora da plataforma) visível ao lojista na mesma tela onde já é exibido para afiliações criadas pelo fluxo individual. O sistema SHALL NOT introduzir transferência PIX automática nem coleta de chave PIX de afiliado para as afiliações criadas por este fluxo.

#### Scenario: Venda por afiliação criada em lote aparece pro lojista
- **WHEN** uma venda é atribuída a uma afiliação criada por este fluxo
- **THEN** o valor de `repasse_afiliado` daquela venda aparece no painel do seller (`seller/pedidos`) da mesma forma que já aparece hoje para afiliações do fluxo individual, para que o lojista saiba quanto deve pagar ao afiliado
