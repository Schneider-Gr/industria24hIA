# Brainstorm: mascote guia, tutorial por tela e dicas de campo no painel do seller

Sessão de 11/09/2026. Lente ativa: especificação de projeto de desenvolvimento.
Nada foi implementado — este documento é o estado da decisão e o plano de execução.

## Problema

O painel do seller tem 22 telas e um tour guiado único de 7 passos
(`src/components/seller/TourGuiado.tsx`), disparado só por um botão na tela de
Tutoriais, onde quase ninguém chega. Os formulários não têm nenhuma ajuda ao
lado dos campos, e vários deles travam dinheiro quando preenchidos errado
(chave PIX ausente deixa o repasse inelegível; peso ausente faz o frete sair
com 1 kg de placeholder). O Manual do Seller acabou de virar página
(`/seller/central-de-duvidas`, PR #600), mas vive isolado do ponto em que a
dúvida aparece, que é o campo do formulário.

## Decisões

| Decisão | Escolha | Justificativa | Estado |
|---|---|---|---|
| Autorização de imagem do mascote | Concedida | Declarada pela dona do produto | Decidido |
| Escopo inicial | Produtos, Pedidos, Minha Loja, Promoções, Venda Futura | Telas onde errar custa dinheiro ou trava pedido | Decidido |
| Campos sem cobertura no manual | Rascunho escrito a partir do código, marcado para revisão | A regra do projeto proíbe inventar regra de negócio: o rascunho descreve o que o campo faz, não o que deveria fazer | Decidido |
| Navegação da Central de Dúvidas | Uma rota por tópico (`/seller/central-de-duvidas/<slug>`) | Link curto para mandar ao seller e destino natural do "saiba mais" de cada tela | Decidido |
| Sistema de tour | Estender o `TourGuiado` existente para tours por tela | Infra de balão e ancoragem já existe; um segundo sistema seria retrabalho | Inferido |
| Gatilho do tour | Botão discreto na própria tela + convite automático na primeira visita | Hoje a única entrada é Tutoriais | Inferido |
| Formato da dica | Híbrido: texto fixo onde errar custa dinheiro, ícone "?" no clique no resto | Não existe hover no celular; texto fixo em tudo dobraria a altura do formulário | Inferido |
| Presença do mascote | Balão do tour e convite inicial; nunca ao lado dos campos | Evita o efeito Clippy em tela de uso diário | Inferido |
| Fonte das dicas | Arquivo único indexado por tela e campo | Impede o painel e o manual divergirem | Inferido |
| Imagem do mascote | `docs/assets/mascote-origem.png`: ilustração 3D do mesmo personagem, corpo inteiro, logo completo | Substitui a foto original, cortada ("dústria24h"). Dois recortes: busto para o balão do tour, corpo inteiro para o convite de primeira visita; fundo azul removido nos dois | Decidido |

### Alternativas descartadas

- **Segundo sistema de tour por tela**, independente do `TourGuiado`. Descartado: duas implementações para manter.
- **Tooltip de hover puro.** Descartado: inacessível no celular, onde boa parte dos sellers opera.
- **Mascote ao lado de cada campo.** Descartado: 50 repetições da mesma foto viram ruído e peso de página.
- **Central de Dúvidas em página única com índice fixo lateral.** Perde o link direto por tópico.

## Escopo real, medido no código

| Tela | Formulário | Campos |
|---|---|---|
| Produtos | `ProdutoForm.tsx` | 21 |
| Minha Loja | `LojaForm.tsx` + `ChavePixForm.tsx` | 19 |
| Venda Futura | `VendaFuturaForm.tsx` | 4 |
| Promoções | faixa de desconto progressivo | ~4 |
| Pedidos | não é formulário | dicas de coluna e do código de entrega |

Cerca de 50 dicas, das quais o manual cobre bem umas 30.

### Campos que exigem rascunho (não existem no manual)

- `perecivel` — muda a janela de disputa (24h em vez de 7 dias, segundo o manual). Confirmar no código antes de afirmar.
- `frete_gratis`
- `permite_retirada_na_loja`
- `valor_pedido_minimo` (o manual descreve como "Cadastrar Valor mínimo")
- `tipo_chave_pix`
- `permite_logistica_afiliado` × `parceiro_logistico_habilitado` — **não são o mesmo campo**, embora o manual trate ambos como "o ícone do avião". O primeiro fica no produto e é editável pelo seller e pelo admin; o segundo é gravado numa tabela de revisão à parte e é o que a tela do afiliado logístico lê para liberar a corrida (migration 0095). Ler a 0095 antes de escrever a dica; se a diferença não ficar clara, a dica fica pendente em vez de chutar.

## Plano de execução

Cada etapa vira Issue e PR próprios, conforme o fluxo do projeto.

1. **Ativo do mascote.** A partir de `docs/assets/mascote-origem.png`, gerar dois PNG com fundo removido em `public/`: busto (~200px) para o balão do tour e corpo inteiro (~320px de altura) para o convite. Verificação: cada arquivo abaixo de 40 kB e legível em fundo claro e escuro.
2. **Fonte única de dicas.** `src/components/seller/dicas.ts`, indexado por tela e nome de campo, com marcação de rascunho pendente de revisão e do peso da dica (fixa ou "?"). Verificação: teste que garante que todo campo marcado como crítico tem texto e que nenhum rascunho vai para produção sem a marcação.
3. **Componente de dica.** Um só componente, com as duas variantes (texto fixo e "?" no clique), acessível por teclado e sem depender de hover. Verificação: abre e fecha no toque a 390px.
4. **Aplicar aos cinco formulários.** Produto e Minha Loja primeiro, que concentram os campos que travam dinheiro.
5. **Central de Dúvidas em rotas.** `/seller/central-de-duvidas/<slug>` por tópico, com a raiz virando índice. Manter as âncoras antigas funcionando por redirect, porque o link já foi para produção no PR #600. Verificação: `/seller/central-de-duvidas#repasse` continua chegando ao conteúdo certo.
6. **Tour por tela.** Quebrar `PASSOS` em grupos por rota, botão de início em cada tela e convite na primeira visita (a preferência fica no navegador do seller). Verificação: o tour de cada tela roda sem sair dela.
7. **"Saiba mais" por tela**, apontando para o tópico correspondente da Central.

### Riscos

- **Conteúdo pela metade.** Metade dos campos com ajuda e metade sem parece defeito. Mitigação: fechar tela por tela, nunca campo por campo espalhado.
- **Rascunho virando verdade.** Um texto meu descrevendo o que o código faz pode ser lido como regra de negócio oficial. Mitigação: marcação explícita de rascunho na fonte de dados e revisão da equipe antes de tirar a marca.
- **Altura do formulário no celular.** Produto tem 21 campos; texto fixo demais transforma a tela numa rolagem infinita. Mitigação: o critério de texto fixo é "errar custa dinheiro", e nada além disso.
- **Mascote saturando.** Mitigação: aparece só no tour e no convite inicial.

## Pendências

| Pendência | O que destrava |
|---|---|
| Diferença entre `permite_logistica_afiliado` e `parceiro_logistico_habilitado` | Leitura da migration 0095 na etapa 2 |
| Efeito real de `perecivel` na janela de disputa | Leitura do código de disputas antes de escrever a dica |
