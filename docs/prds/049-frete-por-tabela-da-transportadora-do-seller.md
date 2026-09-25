---
prd_number: "049"
status: pronto
priority: alta
created: 2026-09-24
issue: ""
depends_on: ["008", "036", "041"]
references:
  - "docs/prds/008-frete-uber-direct-fallback.md" – regra atual de quais opções de frete aparecem no checkout
  - "docs/prds/036-ledger-estoque-multi-local.md" – estoque e reserva por centro de distribuição
  - "docs/prds/041-taxonomia-importavel-e-comissao-por-no.md" – árvore de taxonomia e regra de herança por nó
  - "docs/prds/050-entrega-a-combinar-com-o-vendedor.md" – o que acontece quando não há frete calculável
  - "docs/prds/052-frete-no-repasse-do-seller.md" – para quem vai o valor do frete
  - "docs/prds/048-devolucao-e-estorno-ao-comprador.md" – estorno ao comprador (PR #748, não mergeado); usado no cancelamento por não envio
  - "supabase/migrations/0111_repasse_automatico_confirmacao_entrega.sql" – hoje a entrega só é confirmada pelo token do comprador digitado pelo entregador ou lojista
  - "supabase/migrations/0118_disputa_venda_futura_devolucao_parcial.sql" – fluxo de disputa usado no "Não recebi"
  - "docs/prd/fluxo-frete-completo.md" – fluxo de frete ponta a ponta (motor % por faixa de CEP)
  - "openspec/changes/archive/2026-08-27-transportadoras-tabela-frete-upload/" – entrega original do upload de tabela (PR #441)
  - "https://github.com/Schneider-Gr/industria24hIA/pull/460" – PR aberto que atualiza fluxo-frete-completo
  - "https://industria24h.com.br/admin" – tela legada Entregas > Transportadoras > Cadastrar (Bubble)
  - "https://a9a12d4820a222955c6da6c11ad5421e.cdn.bubble.io/f1727965599917x111519443872055260/modeloCSVtransportadora.csv" – modelo CSV oficial do Bubble
  - "https://ajuda.intelipost.com.br/pt-BR/articles/10279737-orientacoes-sobre-a-tabela-de-frete-padrao-intelipost" – modelo de mercado (Intelipost), com multi-origem e taxas
  - "https://help.vtex.com/pt/docs/tutorials/planilha-de-frete" – modelo de mercado (VTEX)
  - "https://github.com/welyab/cep" – base pública de CEPs usada na planilha de Manaus por bairro
---

# PRD 049: Frete por tabela de transportadora, com origem no CD e escolha no checkout

## 1. Contexto

- **Produto/área**: painel do seller (`/seller/transportadoras`), painel do admin e checkout do marketplace industria24.com.br.
- **Estado atual** (verificado em produção e no Bubble em 24/09/2026):
  - Existem só duas transportadoras cadastradas: "Entrega Rápida I24", criada para teste, e a Uber Direct. Nenhuma linha de tabela de frete. No Bubble legado, a lista de transportadoras também está vazia.
  - O upload atual espera uma planilha de cotação por envio e grava cada linha como um ponto exato (um CEP e um peso). O carrinho quase nunca bate, e o checkout cai no frete percentual sem avisar.
  - O checkout mostra no máximo uma opção de frete, com nome genérico, sem transportadora nem prazo.
  - Ao criar o pedido, o frete da tabela é recalculado com peso zero e com a primeira transportadora encontrada, não com a escolhida. Resultado: preço diferente do exibido ou pedido recusado.
  - A origem do frete não existe no cálculo. Cada loja tem centros de distribuição (CDs) e o produto se liga a CDs, mas o CD não tem CEP: o campo de localização é texto livre, há CDs sem endereço e um aponta para Nova York. Hoje nenhuma loja tem mais de um CD ativo; o CD da Indústria em Manaus (CEP 69088-067) já existe.
  - O Bubble tinha o modelo correto de cadastro (fator de cubagem, limites de peso e de valor, URL de rastreio, categorias) e um CSV de faixas (CEP × peso, valor, prazos, AdValorem, KgAdicional, ICMS).
  - Só 58 de 127 produtos aprovados têm peso e as três medidas.
  - Depois da venda, o seller move o pedido para Em Separação e Enviado sem informar código de rastreio. A entrega só é confirmada quando o entregador ou o lojista digita o token do comprador (migration 0111), e só essa confirmação libera o repasse (0158). Uma transportadora terceira não digita token: sem regra nova, todo pedido enviado por ela fica sem repasse.
- **Problema**: o seller não consegue oferecer as transportadoras com que trabalha nem a plataforma consegue oferecer as que negociou; o frete não considera de onde o produto sai; o comprador não vê opções nem prazo; e o valor cobrado no pedido pode divergir do exibido.

> Contexto técnico (motor de frete, RPCs de cotação e de criação de pedido) vive no TRD e nas migrations citadas nas referências.

## 2. Solução Proposta

### Visão de produto

- Todo frete é calculado por **faixa de CEP de origem (o CD de onde sai) × faixa de CEP de destino × faixa de peso**. Bairro, zona e tipo de veículo são só formas de preencher; o sistema grava faixas de CEP.
- Transportadoras de duas origens: **globais**, negociadas e cadastradas pela plataforma, que cada seller ativa; e **próprias** do seller. Cada uma declara os nós de categoria que leva, limites de peso, valor e medidas, e fator de cubagem.
- Dois jeitos de preencher a tabela: **modo simples** (grade zona × veículo por CD, pensada para transportadora pequena) e **modo avançado** (planilha no formato do Bubble ampliado, com origem opcional).
- No checkout, cada loja escolhe o CD que tem todos os itens com o menor frete; o carrinho vira envios (por CD e por grupo de transportadora); o comprador escolhe a transportadora de cada envio, vendo nome, valor e prazo.
- O pedido grava as transportadoras escolhidas e os mesmos valores exibidos, recalculados pela plataforma.
- Onde nada disso dá preço, o produto passa a "Entrega a combinar com o vendedor" (PRD 050).
- Depois da venda, o seller informa o código de rastreio ao marcar "Enviado"; o comprador confirma o recebimento ou a entrega é confirmada sozinha depois do prazo, o que libera o repasse.

### Decisões de produto

1. O preço vem de faixa de CEP de origem × faixa de CEP de destino × faixa de peso, sem faixa por volumes. Motivo: é como as transportadoras cobram; com cubagem e kg adicional, o peso captura o tamanho da carga (decisões da dona, 24/09).
2. A origem do frete é o CEP do CD de onde o item sai. Todo CD passa a ter CEP e endereço obrigatórios e marca se aceita retirada. Motivo: o fabricante pode ter vários CDs, lojas físicas e pontos de coleta (decisão da dona, 24/09).
3. O checkout escolhe, entre os CDs da loja que têm estoque de todos os itens, o de menor frete; se nenhum tem tudo, divide o carrinho por CD (decisão da dona, 24/09).
4. Peso cobrado = maior entre peso real e peso cubado (medidas ÷ fator de cubagem da transportadora), somando todas as unidades. No modo simples não há cubagem: o limite de peso e de medidas de cada veículo faz esse papel (decisões da dona, 24/09).
5. Transportadoras globais são negociadas e cadastradas pela plataforma, e cada seller ativa na própria loja; o seller também pode cadastrar as suas (decisão da dona, 24/09). A global começa desativada nas lojas.
6. A transportadora se liga a um ou mais nós da árvore de categorias e leva os produtos daquele nó e dos nós abaixo; sem nó marcado, leva tudo (decisão da dona, 24/09).
7. Carrinho misto é dividido em envios; preferência por envio único quando alguma transportadora leva tudo; o comprador paga a soma (decisões da dona, 24/09).
8. O comprador escolhe a transportadora de cada envio (decisão da dona, 24/09).
9. "Peso mínimo/máximo transportado" é o limite de peso cobrado por envio; "Preço mínimo/máximo transportado" é a faixa de valor dos produtos do envio que a transportadora aceita (decisão da dona, 24/09). Altura, largura e comprimento máximos também limitam: produto maior esconde a transportadora (decisão da dona, 24/09).
10. Frete do envio: subtotal = valor da faixa + kg adicional × kg acima do peso final da última faixa + AdValorem% × valor dos produtos + taxa fixa por envio; aplica-se o maior entre subtotal e frete mínimo; sobre isso, ICMS "por dentro" (÷ (1 − ICMS%)). Colunas vazias valem zero. GRIS é somado ao AdValorem (recomendação aceita pela dona, 24/09).
11. Modo simples: grade de zonas de destino × veículos (moto, carro, utilitário), por CD, com peso e medidas máximas de cada veículo, prazo e zonas não atendidas; cidades vizinhas de Manaus (Iranduba, Manacapuru, Rio Preto da Eva, Presidente Figueiredo, Careiro) entram como linhas extras. Preenchido pelo seller no painel (decisões da dona, 24/09). O sistema escolhe o menor veículo que comporta o envio.
12. Produto sem peso ou sem alguma das três medidas não entra no cálculo por tabela: ele passa a "Entrega a combinar" (PRD 050), dentro das regiões declaradas no produto. Motivo: evita frete subestimado sem tirar o produto de venda (decisão da dona, 24/09, que substitui "somente retirada"). A sugestão de peso e medidas pelo Jev (PRD 051) reduz esses casos.
13. As regiões declaradas no produto continuam sendo o limite de onde ele é vendido (decisão da dona, 24/09).
14. Ordem das fontes de frete por envio: transportadoras de tabela; se nenhuma atende e a loja não tem transportadora de tabela ativa, o frete percentual por CEP de hoje e, sem ele, Uber Direct (PRD 008); se ainda não houver preço, "Entrega a combinar" (PRD 050) *(premissa aceita pela dona em 24/09)*. **Adendo (24/09, PRD 053):** a entrega por km do afiliado logístico não entra nesta cadeia; é uma opção paralela, exibida junto com as demais quando a loja tem afiliado aprovado e todos os itens estão habilitados.
15. Na transportadora global, a plataforma negocia só o preço; o seller contrata e paga. O frete de transportadora que o seller paga vai integral para ele, sem comissão: regra detalhada no PRD 052 (decisão da dona, 24/09). **Correção**: a versão anterior deste PRD dizia "o frete segue no repasse como hoje"; hoje o frete não entra no repasse (migration 0158).
16. A "Entrega Rápida I24" é desativada (transportadora de teste; 0 pedidos com ela). Efeito: Manaus volta ao frete padrão de 10%.
17. Cobrança por km fica fora por enquanto; só volta se as transportadoras consultadas cobrarem assim (decisão da dona, 24/09).
18. A transportadora própria entra no checkout sem aprovação prévia. O admin vê as transportadoras de todas as lojas e pode desativar qualquer uma; a desativada pelo admin só o admin reativa. Pedidos já pagos com ela seguem normalmente (decisão da dona, 24/09). Motivo: aprovação prévia trava o seller pequeno; o seller responde pelo frete que cobra.
19. Para ativar uma transportadora global, o seller informa o código de cliente na transportadora e aceita "tenho contrato ativo com ela" (decisão da dona, 24/09). Motivo: o seller contrata e paga; sem contrato, o comprador pagaria um frete que ninguém executa.
20. A plataforma encerra uma global marcando a data de encerramento: os sellers que a usam são avisados 7 dias antes, ela some do checkout nessa data e os pedidos pagos seguem. Quem quiser continuar com ela a cadastra como própria (decisão da dona, 24/09).
21. A página do produto mostra o frete mais barato para o CEP do comprador, com prazo e "ver outras", com o mesmo cálculo do checkout (decisão da dona, 24/09). No checkout, a mais barata vem pré-selecionada e a de menor prazo leva o selo "mais rápida" (decisão da dona, 24/09).
22. Prazo exibido = dias úteis para postar da loja (padrão 1) + prazo da tabela. O seller é lembrado quando estoura o prazo para postar (decisão da dona, 24/09).
23. Ao marcar "Enviado" num envio por transportadora de tabela, o código de rastreio é obrigatório; o comprador recebe o link montado com a URL de rastreio da transportadora (decisão da dona, 24/09).
24. A entrega por transportadora de tabela é confirmada quando o comprador clica "Recebi"; sem clique, é confirmada automaticamente 7 dias corridos após o prazo máximo, se o envio tem código de rastreio e não há disputa aberta. No modo simples, o token do comprador continua sendo o caminho principal e a confirmação automática é reserva (decisão da dona, 24/09). Motivo: padrão de marketplace; o dinheiro do seller não fica refém de um clique.
25. "Não recebi" aparece a partir do dia seguinte ao prazo máximo, abre a disputa existente e suspende a confirmação automática. O seller não estende prazo (decisão da dona, 24/09).
26. Sem "Enviado" até o prazo para postar mais 5 dias úteis, o comprador pode cancelar o pedido com estorno integral de produto e frete, conforme o PRD 048; o seller é avisado (decisão da dona, 24/09).
27. A confirmação é por envio; o repasse continua por pedido, liberado quando o último envio é confirmado (regra atual da 0158) (decisão da dona, 24/09).
28. Extravio ou avaria pela transportadora: o comprador é reembolsado e o prejuízo é do seller, que cobra da transportadora; a plataforma só media. Vale também para a global, porque o contrato é do seller (decisão da dona, 24/09).

### Fora do escopo

- Override da tabela global por loja: o seller que quiser outro preço cadastra transportadora própria *(premissa aceita pela dona em 24/09)*.
- Cobrança centralizada (a plataforma pagar a transportadora e reter o frete).
- Cobrança por km e cotação em tempo real por API de transportadora.
- Empacotamento de vários produtos numa caixa; o peso cubado é a soma por unidade.
- Transferência de estoque entre CDs para completar um pedido.
- Etiqueta, CT-e e rastreio integrado (a URL de rastreio é só exibida).
- Frete grátis por valor mínimo de pedido.
- Extensão de prazo pelo seller (decisão 25); volta se as disputas por atraso aparecerem nas métricas.
- Repasse por envio (decisão 27); refinamento do PRD 052 se os sellers reclamarem da espera.
- Penalidade ao seller por atraso na postagem; nesta versão, só lembrete e cancelamento pelo comprador.
- Aprovação prévia de transportadora própria pelo admin (decisão 18).

## 3. Funcionalidades

### US01: Cadastrar transportadora própria da loja

Como seller, quero cadastrar as transportadoras com que trabalho, com os dados que elas me passam, para que o frete seja calculado como elas me cobram.

**Rules:**
- A transportadora pertence à loja e só aparece nos carrinhos dela.
- Campos: nome (obrigatório), código de referência, peso mínimo e máximo por envio (kg), valor mínimo e máximo dos produtos por envio (R$), altura, largura e comprimento máximos (cm), fator de cubagem (obrigatório no modo avançado), URL de rastreio, ativa (sim/não). Limites vazios significam "sem limite".
- Editar, ativar e desativar; desativada some do checkout na hora.
- Entra no checkout sem aprovação (decisão 18). O admin lista as transportadoras de todas as lojas e pode desativar qualquer uma, com motivo que o seller vê; a desativada pelo admin só o admin reativa.

**Edge cases:**
- Mínimo maior que o máximo (peso ou valor) → erro no campo.
- Dois cadastros com o mesmo nome na mesma loja → bloqueia o segundo *(premissa aceita pela dona em 24/09)*.
- Desativar com pedido em aberto → o pedido existente não muda.

### US02: Subir a tabela de frete no modo avançado

Como seller ou admin, quero subir a tabela de faixas de uma transportadora numa planilha, para não cadastrar preço linha a linha.

**Rules:**
- Colunas: CepInicial, CepFinal, PesoInicial, PesoFinal, Valor, Prazo Entrega Maximo, Prazo Entrega Minimo, AdValorem, KgAdicional, ICMS, Frete Minimo, Taxa Fixa por Envio, e as opcionais CepOrigemInicial e CepOrigemFinal (vazias = qualquer CD da loja). O formato antigo do Bubble também é aceito.
- CSV (`;`) ou XLSX; CEP com ou sem máscara; números com vírgula ou ponto, com ou sem aspas. Valor sem "R$"; AdValorem e ICMS sem "%".
- CepInicial, CepFinal, PesoInicial, PesoFinal e Valor são obrigatórios; os demais, vazios, valem zero.
- Limites inclusivos. Duas linhas da mesma transportadora não podem cobrir o mesmo CEP de origem, CEP de destino e peso: o preview aponta as linhas conflitantes e a tabela não é gravada até o seller corrigir (decisão da dona, 24/09).
- Preview com linhas válidas e erros por linha antes de gravar; nova tabela substitui a anterior da transportadora, após confirmação *(premissa aceita pela dona em 24/09)*.
- XLSX com várias abas: lê a aba "Faixas" (ou a primeira) e ignora colunas extras (Bairro, Zona).
- Linha com Valor vazio ou "Atende" = N é ignorada; o preview informa quantas.
- Limite de 15.000 linhas.
- Modelos para download: planilha padrão (abas Faixas, Dados da transportadora, Instruções) e "Manaus por bairro" (67 bairros, 690 faixas de CEP, preço por zona com ajuste por bairro).

**Edge cases:**
- Planilha de cotação por envio (CEP origem, CEP destino, Volume, Peso...) → recusa com mensagem apontando o modelo.
- CEP inicial maior que o final, peso final menor que o inicial, prazo mínimo maior que o máximo → erro na linha.
- Valor negativo ou não numérico → erro na linha.
- Prazos vazios → aceita; o checkout mostra "prazo a combinar" *(premissa aceita pela dona em 24/09)*.
- Planilha só com erros → nada é gravado; a tabela anterior continua.
- Mais de 15.000 linhas → recusa inteiro.

### US03: Ver e gerir tabelas e pendências

Como seller, quero ver as tabelas ativas e o que impede o frete de funcionar, para saber o que o comprador vai pagar e o que corrigir.

**Rules:**
- Lista, por transportadora (própria ou global ativada), nós de categoria, limites e faixas ativas por CD, com opção de desativar uma faixa (só nas próprias).
- Lista os produtos sem peso ou sem alguma medida ("vão para Entrega a combinar"), com link para editar e, quando houver, a sugestão do Jev para confirmar (PRD 051).
- Lista os produtos que nenhuma transportadora ativa leva e os CDs sem CEP.

**Edge cases:**
- Transportadora sem faixa ativa → aviso "sem tabela, não aparece no checkout".
- Tudo completo → pendências em estado vazio positivo.

### US04: Calcular o frete de uma transportadora para um envio

Como comprador, quero que o frete reflita de onde o produto sai, para onde vai, o peso e o tamanho da compra, para pagar um valor justo e previsível.

**Rules:**
- Peso real = soma de peso × quantidade; peso cubado = soma de (A × L × C em cm × quantidade) ÷ fator; peso cobrado = o maior dos dois (sem cubagem no modo simples).
- A transportadora atende o envio quando: está ativa para a loja; leva todos os produtos do envio (decisão 6); o peso cobrado, o valor dos produtos e as medidas de cada produto estão dentro dos limites; e há faixa ativa com o CEP de origem do CD e o CEP de destino.
- Faixa aplicada: a que contém origem, destino e peso cobrado; acima da maior faixa, a maior faixa mais kg adicional × kg excedente.
- Valor conforme a decisão 10, arredondado em centavos. Prazo: "de [mín.] a [máx.] dias úteis" *(premissa aceita pela dona em 24/09)*.
- Modo simples: menor veículo que comporta peso real e medidas de todos os produtos do envio; preço da zona de destino para esse veículo.

**Edge cases:**
- Peso acima da maior faixa com kg adicional vazio → a transportadora não é oferecida para esse envio e o checkout segue para a próxima fonte; o preview do upload avisa "sem KgAdicional, pesos acima de [maior faixa] kg não terão frete" (decisão da dona, 24/09).
- Nenhum veículo comporta o envio no modo simples → a transportadora não aparece.
- Mais de uma faixa atende (dados gravados antes da validação de sobreposição) → usa a de menor valor, só como rede de segurança *(premissa aceita pela dona em 24/09)*.

### US05: Escolher a transportadora de cada envio no checkout

Como comprador, quero ver as transportadoras que atendem meu endereço, com valor e prazo, para escolher a que me serve.

**Rules:**
- O checkout agrupa por loja, escolhe o CD (US12) e divide em envios por grupo de transportadora (decisão 7).
- Para cada envio: transportadoras que atendem, com nome, valor e prazo, ordenadas por valor, a mais barata pré-selecionada e a de menor prazo com o selo "mais rápida" (decisão 21); envio com vários produtos mostra quais vão nele.
- O prazo mostrado inclui os dias úteis para postar da loja (decisão 22).
- Total de frete = soma dos envios. A lista é recalculada ao mudar CEP, endereço ou itens, mantendo a escolha se ela continuar disponível.
- Envio sem transportadora de tabela segue a decisão 14.

**Edge cases:**
- A transportadora escolhida deixa de atender → seleciona a mais barata e avisa.
- Nenhuma opção para um envio → mostra "Entrega a combinar" (PRD 050) ou retirada, se houver.

### US06: Gravar o pedido com as transportadoras, os CDs e os valores exibidos

Como comprador, quero pagar exatamente o frete que escolhi, para não ter surpresa nem erro ao finalizar.

**Rules:**
- O pedido grava, por envio: produtos, CD de origem, transportadora, valor e prazo. A reserva de estoque sai do CD escolhido (PRD 036).
- A plataforma recalcula cada frete ao criar o pedido, com peso real do cadastro e tabela vigente, sem usar valor do navegador.
- O seller vê no pedido o CD, a transportadora e a URL de rastreio de cada envio.

**Edge cases:**
- Tabela, transportadora, produtos ou estoque do CD mudaram entre a cotação e a finalização → o pedido não é criado; o checkout avisa, recalcula e pede nova confirmação *(premissa aceita pela dona em 24/09)*.

### US07: Ligar a transportadora aos nós da árvore de categorias

Como seller ou admin, quero indicar o tipo de produto que cada transportadora leva, para que bebidas saiam por uma e adubos por outra.

**Rules:**
- Um ou mais nós da árvore (a mesma da comissão); o nó vale para os nós abaixo. Sem nó marcado, leva todos os produtos.
- Ao marcar um nó, a tela mostra quantos produtos da loja ele cobre *(premissa aceita pela dona em 24/09)*.

**Edge cases:**
- Produto sem nó → só é levado por transportadora sem nó marcado.
- Nó removido da árvore → some da lista e o dono da transportadora vê aviso *(premissa aceita pela dona em 24/09)*.
- Nós sobrepostos entre transportadoras → ambas atendem, e o comprador escolhe.

### US08: Cadastrar transportadora global da plataforma

Como administrador, quero cadastrar as transportadoras que negociei, com tabela e categorias, para que os sellers usem o preço negociado sem montar tabela.

**Rules:**
- Mesmos campos, tabela (modo simples ou avançado) e nós das transportadoras próprias, gravados como global. Como a origem varia por loja, a tabela global usa faixa de CEP de origem (ex.: Manaus inteira).
- Só aparece nas lojas que a ativaram (US09); alterar a tabela vale na hora para elas.

**Edge cases:**
- Admin desativa a global → some de todas as lojas; pedidos feitos não mudam.
- Admin marca data de encerramento → sellers que a usam são avisados 7 dias antes; na data ela some do checkout; pedidos pagos seguem (decisão 20).
- Admin troca a tabela → sellers que a usam veem aviso de "tabela atualizada" *(premissa aceita pela dona em 24/09)*.

### US09: Ativar transportadora global na loja

Como seller, quero ativar as transportadoras negociadas pela plataforma, para oferecer frete sem negociar sozinho.

**Rules:**
- Lista de globais com nós, limites e tabela (somente leitura) e botão ativar/desativar por loja; começam desativadas.
- Ativar exige o código de cliente do seller na transportadora e o aceite "tenho contrato ativo com ela" (decisão 19). O código fica visível ao seller e ao admin.

**Edge cases:**
- Nenhum CD da loja dentro das origens da tabela global → pode ativar, com aviso de que ela não vai atender.
- Sem código de cliente ou sem o aceite → não ativa.
- Desativar com pedido em aberto → o pedido não muda.

### US10: Cadastrar CEP e endereço dos CDs e pontos de retirada

Como seller, quero registrar onde ficam meus CDs, lojas físicas e pontos de coleta, para que o frete saia do lugar certo e o comprador possa retirar perto.

**Rules:**
- Todo CD ativo tem CEP (8 dígitos, validado), endereço, e marca "aceita retirada" e horários de retirada.
- CD sem CEP não é usado como origem de frete por tabela; os produtos só dele vão para "Entrega a combinar" ou retirada.
- Na retirada, o comprador escolhe entre os CDs que aceitam retirada e têm estoque de todos os itens.
- Os CDs atuais sem CEP ou com localização inválida aparecem como pendência na US03.

**Edge cases:**
- CEP que não existe (consulta de CEP falha) → não grava e pede correção.
- Localização atual em outro país ou texto livre → não é convertida sozinha; o seller confirma o endereço *(premissa aceita pela dona em 24/09)*.

### US11: Preencher a tabela no modo simples (zona × veículo)

Como seller, quero preencher o preço da minha transportadora pequena numa grade simples, sem planilha, porque é assim que ela me passa o preço.

**Rules:**
- Por CD de origem: linhas = zonas de destino (Norte, Sul, Leste, Oeste, Centro-Sul, Centro-Oeste, Rural, Distrito Industrial, e as cidades vizinhas); colunas = veículos (moto, carro, utilitário), cada um com peso e medidas máximas editáveis.
- Campos: preço por zona e veículo, prazo mínimo e máximo, zonas não atendidas. "Avançado" (fechado por padrão): AdValorem, ICMS, frete mínimo, taxa fixa.
- "Copiar de outro CD" preenche a grade a partir de outro CD da loja.
- Ao salvar, o sistema converte a grade em faixas de CEP (bairros de Manaus e CEPs das cidades vizinhas, da mesma base da planilha por bairro).
- Veículo sem preço = a transportadora não tem esse veículo.

**Edge cases:**
- Zona sem preço em nenhum veículo → tratada como não atendida.
- Limites de veículo em ordem incoerente (moto maior que carro) → bloqueia a gravação até o seller corrigir (decisão da dona, 24/09).

### US12: Escolher o CD de expedição no checkout

Como comprador, quero que meu pedido saia do lugar mais vantajoso, para pagar menos frete e receber mais rápido.

**Rules:**
- Para cada loja do carrinho, considera os CDs com CEP e estoque de todos os itens, calcula o frete de cada um e usa o de menor frete (decisão 3); empate → menor prazo, depois o CD padrão *(premissa aceita pela dona em 24/09)*.
- Se nenhum CD tem todos os itens, divide o carrinho por CD, preferindo o menor número de CDs.
- O CD escolhido não é exibido ao comprador como decisão; ele vê os envios e, na retirada, o endereço *(premissa aceita pela dona em 24/09)*.

**Edge cases:**
- Estoque do CD escolhido acaba antes de finalizar → recalcula com outro CD e avisa se o frete mudar.
- Nenhum CD com estoque → produto indisponível, como hoje.

### US13: Ver o frete na página do produto

Como comprador, quero ver o frete e o prazo antes de pôr no carrinho, para não desistir no checkout.

**Rules:**
- Com o CEP conhecido do comprador, mostra a transportadora mais barata para 1 unidade, com valor e prazo (decisões 21 e 22), e "ver outras" com as demais.
- Mesmo cálculo da US04, a partir do CD que o checkout usaria (US12).

**Edge cases:**
- Sem CEP conhecido → pede o CEP.
- Sem frete de tabela → segue a decisão 14; sem nenhuma fonte, mostra "Entrega a combinar" (PRD 050).

### US14: Marcar o envio como enviado, com rastreio

Como seller, quero registrar o envio com o código de rastreio, para o comprador acompanhar e a entrega poder ser confirmada.

**Rules:**
- A loja define os dias úteis para postar (padrão 1).
- Envio por transportadora de tabela: "Enviado" exige o código de rastreio. O comprador recebe e-mail e WhatsApp com o link montado com a URL de rastreio da transportadora (decisão 23).
- Envio do modo simples ou entrega própria: código opcional; a confirmação segue pelo token do comprador (decisão 24).
- Estourou o prazo para postar sem "Enviado" → lembrete ao seller (decisão 22).
- Prazo para postar + 5 dias úteis sem "Enviado" → o comprador vê "Cancelar pedido", com estorno integral de produto e frete conforme o PRD 048; o seller é avisado (decisão 26).

**Edge cases:**
- Transportadora sem URL de rastreio → o comprador vê o código e o nome da transportadora, sem link.
- Código de rastreio corrigido depois de enviado → o comprador é avisado do novo link.
- Pedido já cancelado pelo comprador → o seller não marca "Enviado".

### US15: Confirmar a entrega de cada envio

Como seller, quero que a entrega feita por transportadora seja confirmada sem depender de token, para receber o repasse.

**Rules:**
- Cada envio tem sua confirmação (decisão 27). O comprador vê "Recebi" em cada envio marcado como enviado.
- Envio por transportadora de tabela sem clique → confirmado automaticamente 7 dias corridos após o prazo máximo, se tem código de rastreio e não há disputa aberta (decisão 24).
- Modo simples: o motorista digita o token do comprador, como hoje; a confirmação automática vale como reserva.
- O repasse do pedido é liberado quando o último envio é confirmado (regra atual da 0158).

**Edge cases:**
- Envio sem código de rastreio → não há confirmação automática; só o comprador ou o token confirmam.
- Disputa aberta → a confirmação automática fica suspensa até a disputa ser resolvida.
- Comprador clica "Recebi" antes do prazo → confirma na hora.

### US16: Avisar que não recebeu

Como comprador, quero reclamar quando o prazo passou e o produto não chegou, para ter meu dinheiro protegido.

**Rules:**
- "Não recebi" aparece a partir do dia seguinte ao prazo máximo do envio, abre a disputa existente e suspende a confirmação automática (decisão 25).
- O seller não estende o prazo.
- Extravio ou avaria confirmados → o comprador é reembolsado e o prejuízo é do seller, que cobra da transportadora (decisão 28).

**Edge cases:**
- Antes do prazo máximo → o botão não aparece; o comprador acompanha pelo rastreio.
- Envio já confirmado → reclamação segue pela devolução (PRD 048), não pelo "Não recebi".

## 4. Fluxo de Negócio

```
Comprador informa endereço completo
   │
   ▼
Para cada loja: CDs com CEP e estoque de todos os itens?
   ├── sim ──▶ calcula o frete a partir de cada um, fica com o menor
   └── não ──▶ divide o carrinho por CD (menor número de CDs)
   │
   ▼
Para cada CD: produto sem peso ou medidas? ── sim ──▶ Entrega a combinar (PRD 050)
   │
   ▼
Alguma transportadora leva todos os produtos (nós, limites, faixa origem→destino)?
   ├── sim ──▶ envio único
   └── não ──▶ envios por grupo de transportadora
   │
   ▼
Envio sem transportadora de tabela ──▶ (loja sem tabela) frete % ──▶ Uber Direct ──▶ Entrega a combinar
   │
   ▼
Comprador escolhe a transportadora de cada envio ──▶ Finalizar: recalcula ──▶ igual? pedido : avisa e pede confirmação
   │
   ▼
Pós-venda, por envio: seller marca Enviado com rastreio (até o prazo para postar)
   ├── não enviou até postar + 5 dias úteis ──▶ comprador pode cancelar (estorno integral, PRD 048)
   ▼
Comprador clica "Recebi" ──────────────┐
Prazo máx. + 7 dias, com rastreio ─────┼──▶ envio confirmado ──▶ último envio? ──▶ repasse do pedido liberado
Token do comprador (modo simples) ─────┘
Prazo máx. passou sem chegar ──▶ "Não recebi" ──▶ disputa (suspende a confirmação automática)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| CD sem CEP não é usado como origem; aparece como pendência | Frete sem origem é chute | Painel e checkout de loja com CD sem CEP |
| Loja com 2 CDs com estoque: o checkout usa o de menor frete para o CEP do comprador | Decisão 3 | Checkout de dois CEPs, um perto de cada CD |
| Nenhum CD com todos os itens → 2 envios, um por CD | Decisão 3 | Checkout com itens em CDs diferentes |
| Seller preenche o modo simples (Zona Norte, moto R$ 15, carro R$ 40) e um envio de 3 kg para um CEP de Cidade Nova mostra R$ 15; um de 50 kg mostra R$ 40 | Modo simples | Checkout com essa grade |
| Planilha avançada com CepOrigem de outra cidade não atende CD de Manaus | Origem faz parte da faixa | Upload e checkout |
| Planilha "Manaus por bairro" preenchida sobe e gera as faixas no preview | Simplificar o seller | Upload |
| Linha com faixa sobreposta, CEP invertido ou valor negativo aparece como erro e não é gravada | Preço ambíguo | Upload com erros |
| Envio com cubagem (3 un. de 1 kg a 30×30×30 cm + 1 un. de 1 kg a 10×10×10 cm, fator 6000) na faixa 5,001 a 30 kg com Valor 40,00 e AdValorem 1% sobre R$ 200 → R$ 42,00; com ICMS 12% → R$ 47,73 | Fórmula da decisão 10 | Checkout de teste |
| Envio leve (1 kg, R$ 50) com Valor 8,00, AdValorem 1%, Taxa Fixa 3,00 e Frete Mínimo 15,00 → R$ 15,00 | Frete mínimo e taxa fixa | Checkout de teste |
| Envio de 120 kg com maior faixa de R$ 150,00 e KgAdicional 1,50 → R$ 180,00 | Carga pesada não some | Checkout de teste |
| Envio de 120 kg com maior faixa de 30 kg e KgAdicional vazio → a transportadora não aparece; o checkout oferece a próxima fonte | Carga pesada não é subcobrada | Checkout de teste |
| Produto de 250 cm com transportadora de comprimento máximo 200 cm → ela não aparece | Carga que não cabe | Checkout de teste |
| Carrinho guaraná + adubo com transportadora A (Bebidas) e B (Agro) → 2 envios; com transportadora geral C → 1 envio | Carrinho misto | Checkout de teste |
| Admin cadastra global; loja que ativou mostra, a que não ativou não mostra | Decisão 5 | Checkout de duas lojas |
| Pedido gravado com CD, transportadora e fretes iguais aos exibidos, inclusive escolhendo a mais cara | Hoje grava peso 0 e a primeira | Finalizar e conferir no painel do seller |
| Produto sem medidas não entra em tabela e mostra "Entrega a combinar" | Decisão 12 | Página do produto e checkout |
| "Entrega Rápida I24" desativada; Manaus volta a 10% | Decisão 16 | Checkout de loja sem tabela |
| Nenhum seller vê ou altera transportadora, tabela ou CD de outra loja | Dado comercial da loja | Tentativa com outra conta |
| Ativar global sem código de cliente ou sem o aceite de contrato não ativa | Frete pago que ninguém executa | Painel do seller |
| Global com data de encerramento some do checkout na data; pedido pago antes segue | Decisão 20 | Checkout e pedido de teste |
| Página do produto mostra o frete mais barato com prazo; no checkout, a mais barata vem marcada e a mais rápida tem selo | Frete visível antes do carrinho | Página do produto e checkout |
| Loja com 2 dias úteis para postar e tabela de 3 a 5 dias → checkout mostra "de 5 a 7 dias úteis" | Prazo que o comprador realmente espera | Checkout de teste |
| "Enviado" em transportadora de tabela sem código de rastreio não grava; com código, o comprador recebe o link | Sem rastreio, "Enviado" não prova nada | Painel do seller e e-mail do comprador |
| Envio com rastreio e sem clique do comprador é confirmado 7 dias após o prazo máximo, e o repasse é liberado quando é o último envio | Hoje o repasse trava sem token | Relógio de teste |
| "Não recebi" só aparece depois do prazo máximo e suspende a confirmação automática | Proteção do comprador sem disputa precoce | Pedido de teste |
| Sem "Enviado" até o prazo para postar + 5 dias úteis → o comprador cancela com estorno integral | Venda paga e não enviada | Pedido de teste (depende do PRD 048) |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Lojas com transportadora ativa (própria ou global) | 0 (produção, 24/09/2026) | 3 lojas de Manaus | 30 dias após o deploy | 1 | Dona do produto |
| CDs ativos com CEP válido | 0 com CEP estruturado (produção, 24/09/2026: localização é texto livre); contagem por loja a levantar (engenharia; até o M1) | 100% dos CDs de lojas ativas | 30 dias após o deploy | 90% | Dona do produto com os sellers |
| Pedidos com entrega fechados com transportadora de tabela | 0 (produção, 24/09/2026) | 50% nas lojas com tabela | 60 dias após o deploy | 20% | Dona do produto |
| Pedidos recusados por "tabela não cobre o CEP" | A levantar (Sentry; engenharia; até o M2) | 0 | Desde o deploy | 0 | Engenharia |
| Produtos aprovados com peso e três medidas | 58 de 127 (produção, 24/09/2026) | 90% | 30 dias após o deploy | 80% | Dona do produto (apoio do PRD 051) |

## 6. Milestones

### Milestone 1: Seller e plataforma publicam transportadoras e tabelas a partir dos CDs

**Por que é um marco:** a plataforma passa a saber de onde cada produto sai, e seller e plataforma conseguem publicar o preço das transportadoras, pela grade simples ou pela planilha.

**Funcionalidades:** US01, US02, US03, US07, US08, US09, US10, US11

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] CD sem CEP não é usado como origem; aparece como pendência
- [ ] Seller preenche o modo simples e o preview mostra as faixas geradas
- [ ] Planilha "Manaus por bairro" preenchida sobe e gera as faixas no preview
- [ ] Linha com faixa sobreposta, CEP invertido ou valor negativo aparece como erro e não é gravada
- [ ] Modo simples com limite de moto maior que o de carro não grava até corrigir
- [ ] Admin cadastra global; o seller ativa na loja
- [ ] Nenhum seller vê ou altera transportadora, tabela ou CD de outra loja

**Aprovador:** dona do produto

### Milestone 2: Comprador recebe frete do CD certo, escolhe a transportadora e paga o exibido

**Por que é um marco:** o frete passa a considerar de onde o produto sai, o comprador vê opções reais com prazo e paga exatamente o que viu.

**Funcionalidades:** US04, US05, US06, US12

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Loja com 2 CDs usa o de menor frete; sem CD com tudo, divide em 2 envios
- [ ] Modo simples: 3 kg → moto R$ 15; 50 kg → carro R$ 40
- [ ] Cubagem e AdValorem → R$ 42,00; com ICMS → R$ 47,73; frete mínimo → R$ 15,00; 120 kg → R$ 180,00
- [ ] Produto maior que o limite de medidas esconde a transportadora
- [ ] Carrinho misto gera 2 envios; com transportadora geral, 1
- [ ] Pedido gravado com CD, transportadora e fretes iguais aos exibidos
- [ ] Produto sem medidas mostra "Entrega a combinar"
- [ ] "Entrega Rápida I24" desativada e Manaus volta a 10%

**Aprovador:** dona do produto

### Milestone 3: Pós-venda do envio: rastreio, confirmação e "Não recebi"

**Por que é um marco:** sem ele, quem vende por transportadora de tabela não recebe o repasse, porque a entrega só é confirmada por token. Vai para produção junto com o Milestone 2 ou antes dele.

**Funcionalidades:** US13, US14, US15, US16

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Página do produto mostra o frete mais barato com prazo
- [ ] "Enviado" em transportadora de tabela exige código de rastreio; o comprador recebe o link
- [ ] Envio com rastreio é confirmado 7 dias após o prazo máximo e libera o repasse do pedido
- [ ] "Não recebi" só aparece depois do prazo máximo e suspende a confirmação automática
- [ ] Sem "Enviado" até postar + 5 dias úteis, o comprador cancela com estorno integral

**Aprovador:** dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| CDs sem CEP ou com localização errada (um aponta para Nova York) | Alto | US10 obriga CEP; pendência na US03; revisão com os sellers antes do lançamento | Pendente |
| Produtos sem peso e medidas (69 de 127) ficam fora da tabela | Alto | Vão para "Entrega a combinar" (PRD 050); sugestão do Jev (PRD 051) | Pendente |
| Envios demais por carrinho (loja × CD × transportadora) confundem o comprador | Médio | Preferir CD com todos os itens e envio único; mostrar os produtos de cada envio | Pendente |
| Formato do modo simples não bate com como as transportadoras de Manaus cobram (sem tabela pública; estrutura inferida de motoboy e carreto de outras cidades) | Médio | Questionário a 2 ou 3 transportadoras pequenas de Manaus antes de fechar | Pendente |
| Base de CEPs (welyab/cep) desatualizada | Baixo | Faixas cobrem 69000-000 a 69099-999 sem buraco; conferida com ViaCEP (40 de 40) | Mitigado |
| Dimensões cadastradas na unidade errada inflam o peso cubado | Médio | Aviso no cadastro; casos de teste do M2 | Pendente |
| Seller sobe tabela com preço errado | Médio | Preview obrigatório; tabela visível na US03 | Pendente |
| M2 em produção sem o M3: pedidos por transportadora de tabela nunca têm a entrega confirmada e o repasse trava | Alto | M3 vai junto com o M2 ou antes | Pendente |
| Seller marca "Enviado" com código de rastreio falso para disparar a confirmação automática | Médio | Confirmação só 7 dias após o prazo máximo; "Não recebi" suspende; admin desativa a transportadora e o seller responde na disputa | Pendente |
| Transportadora própria com frete irreal, sem aprovação prévia | Médio | Admin vê todas e desativa (decisão 18) | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 008 (fallback Uber Direct) | Interna | Em produção | M2: envios sem tabela mantêm o fallback |
| PRD 036 (estoque por CD e reserva) | Interna | Em produção (parcial) | M2: US12 e a reserva por CD dependem dele |
| PRD 041 (árvore e herança por nó) | Interna | Em produção | M1: US07 |
| PRD 050 (Entrega a combinar) | Interna | Rascunho | Sem ele, produto sem tabela fica sem frete |
| PRD 052 (frete no repasse) | Interna | Rascunho | Sem ele, o frete de transportadora paga pelo seller não chega ao seller |
| Tabelas reais de 2 ou 3 transportadoras de Manaus | Externa | Não recebidas | Validação do modo simples |
| PRD 048 (devolução e estorno ao comprador) | Interna | PR #748 aberto | M3: sem ele, o cancelamento por não envio (decisão 26) exige estorno manual no Asaas |

## 8. Referências

- [PRD 008: Frete via Uber Direct como fallback](./008-frete-uber-direct-fallback.md)
- [PRD 036: Ledger de estoque multi-local](./036-ledger-estoque-multi-local.md)
- [PRD 041: Taxonomia importável e comissão por nó](./041-taxonomia-importavel-e-comissao-por-no.md)
- [PRD 050: Entrega a combinar com o vendedor](./050-entrega-a-combinar-com-o-vendedor.md)
- [PRD 051: Sugestão de peso e medidas pelo Jev](./051-sugestao-de-peso-e-medidas-pelo-jev.md)
- [PRD 052: Frete no repasse do seller](./052-frete-no-repasse-do-seller.md)
- [Fluxo completo de frete](../prd/fluxo-frete-completo.md)
- [Change arquivada: upload de tabela de frete](../../openspec/changes/archive/2026-08-27-transportadoras-tabela-frete-upload/)
- [PR #460](https://github.com/Schneider-Gr/industria24hIA/pull/460)
- [Bubble: Entregas > Transportadoras > Cadastrar](https://industria24h.com.br/admin)
- [Modelo CSV do Bubble](https://a9a12d4820a222955c6da6c11ad5421e.cdn.bubble.io/f1727965599917x111519443872055260/modeloCSVtransportadora.csv)
- [Intelipost: tabela de frete padrão](https://ajuda.intelipost.com.br/pt-BR/articles/10279737-orientacoes-sobre-a-tabela-de-frete-padrao-intelipost) e [VTEX: planilha de frete](https://help.vtex.com/pt/docs/tutorials/planilha-de-frete) – formatos de mercado
- [Base pública de CEPs welyab/cep](https://github.com/welyab/cep) – origem das faixas por bairro de Manaus
- Modelos em `Downloads/modelo de tabelas/` (Bubble, Intelipost, VTEX, AnyMarket, NTC, "Industria24 - Manaus por bairro.xlsx")

## 9. Registro de Decisões

- **2026-09-24:** Preço por faixa de CEP de origem × destino × peso, no formato do Bubble ampliado (Frete Mínimo, Taxa Fixa, origem opcional). Descartados: planilha de cotação por envio e faixa por volumes.
- **2026-09-24:** Origem = CEP do CD; CEP obrigatório no CD. Motivo: fabricante com vários CDs, lojas físicas e pontos de coleta.
- **2026-09-24:** Checkout usa o CD com todos os itens e menor frete; senão divide por CD.
- **2026-09-24:** Peso cobrado = max(real, cubado) no modo avançado; sem cubagem no modo simples.
- **2026-09-24:** Transportadoras globais (plataforma negocia, seller ativa) e próprias. Substitui "cada seller sobe a sua".
- **2026-09-24:** Transportadora por nó da árvore com herança; sem nó = leva tudo; carrinho misto vira envios, preferindo envio único.
- **2026-09-24:** Limites de peso, valor da mercadoria e medidas por transportadora.
- **2026-09-24:** Modo simples zona × veículo por CD, preenchido pelo seller, com cidades vizinhas. Motivo: pequena transportadora cobra por zona e veículo (tabela de motoboy de SP; carreto por km em fontes nacionais; Manaus sem tabela pública). Validar com 2 ou 3 transportadoras de Manaus.
- **2026-09-24:** Produto sem peso ou medidas vai para "Entrega a combinar" (PRD 050), não "somente retirada". Substitui a decisão anterior.
- **2026-09-24:** Regiões declaradas no produto continuam como limite de venda.
- **2026-09-24:** Frete de transportadora paga pelo seller vai integral para ele (PRD 052). Corrige a premissa anterior "segue no repasse como hoje", que era falsa (migration 0158).
- **2026-09-24:** "Entrega Rápida I24" desativada (teste; 0 pedidos). Cobrança por km fora.
- **2026-09-24:** Premissas pendentes: posição do frete percentual na ordem das fontes; tabela nova substitui a anterior; desempate de CD por prazo e CD padrão; "dias úteis"; aviso de tabela global atualizada.
- **2026-09-24:** `depends_on: ["008", "036", "041"]`. Critério: US05 preserva o fallback do PRD 008; US06 e US12 reservam estoque por CD conforme o PRD 036; US07 usa a árvore e a herança do PRD 041. PRDs 050, 051 e 052 dependem deste, não o contrário.
- **2026-09-24:** Todas as premissas pendentes aceitas pela dona; status passa a pronto.
- **2026-09-24:** Grilling com a dona fecha o pós-venda e ajusta o cadastro e o checkout (decisões 18 a 28; US13 a US16; Milestone 3). Fato que motivou o pós-venda: a entrega só é confirmada pelo token do comprador (0111) e só ela libera o repasse (0158); transportadora terceira não digita token. Descartados: PRD separado de pós-venda (a dona preferiu manter no 049), extensão de prazo, repasse por envio e aprovação prévia de transportadora própria.
- **2026-09-24:** Revisão das premissas com a dona muda três regras: faixas sobrepostas são barradas no upload (menor valor fica só como rede de segurança); peso acima da maior faixa sem kg adicional tira a transportadora do envio em vez de cobrar a maior faixa; limites de veículo incoerentes bloqueiam em vez de só avisar. As outras 13 ficam como estavam; a validação do modo simples com transportadoras de Manaus continua pendente.
- **2026-09-24:** Adendo à decisão 14: entrega por km do afiliado (PRD 053) é opção paralela, fora da cadeia de reserva.
