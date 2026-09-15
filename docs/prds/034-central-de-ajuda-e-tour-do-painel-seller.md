---
prd_number: "034"
status: em-progresso
priority: alta
created: 2026-09-15
issue: "#608"
depends_on: ["007", "020"]
references:
  - https://industria24.com.br/seller/central-de-duvidas
  - https://github.com/Schneider-Gr/industria24hIA/issues/608
  - https://github.com/Schneider-Gr/industria24hIA/issues/611
  - https://github.com/Schneider-Gr/industria24hIA/pull/610
  - https://github.com/Schneider-Gr/industria24hIA/pull/614
  - https://github.com/Schneider-Gr/industria24hIA/pull/618
  - https://github.com/Schneider-Gr/industria24hIA/pull/620
  - https://github.com/Schneider-Gr/industria24hIA/pull/625
  - https://github.com/Schneider-Gr/industria24hIA/pull/627
  - https://github.com/Schneider-Gr/industria24hIA/pull/634
  - openspec/changes/ajuda-contextual-painel-seller/
  - openspec/changes/ajuda-contextual-demais-telas-seller/
  - openspec/changes/tour-narrado-e-posicao-ajuda/
  - docs/prds/007-bot-atendimento-multi-persona.md
  - docs/prds/020-bot-atendimento.md
---

# PRD 034: Central de ajuda e tour guiado do painel do seller

## 1. Contexto

- **Produto/área**: painel do vendedor (`/seller`), 22 telas, usado por fabricantes que nunca operaram um marketplace.
- **Estado atual (15/09/2026)**: a feature foi construída e está em produção. Este PRD registra a intenção de produto por trás dela, escrito **depois** da entrega, a pedido da dona. As partes já no ar: dicas por campo, Central de Dúvidas com busca e navegação por tópico, botão flutuante do mascote, convite de primeira visita e tour narrado na voz clonada da dona.
- **Problema que originou tudo**: o painel tinha um tour único de 7 passos, disparado apenas por um botão na tela de Tutoriais, onde quase ninguém chega, e nenhuma ajuda ao lado dos campos. Vários desses campos travam dinheiro quando preenchidos errado — chave PIX ausente deixa o repasse inelegível, peso ausente faz o frete sair com 1 kg de placeholder, lote de coletiva mal calculado obriga o seller a vender no prejuízo para todos os participantes.
- **Fonte de conteúdo**: o Manual do Seller (PDF de operação, set/2026), transcrito para a Central de Dúvidas.

> **Restrição de método que molda esta feature:** o Manual do Seller descreve o painel **Bubble legado**, não o painel reconstruído. Três divergências foram confirmadas no código durante a entrega (ver §8). Consequência prática: **nenhuma ajuda pode ser escrita a partir do manual sem conferir o código**, e o que é escrito a partir do comportamento do código nasce marcado como rascunho até a revisão da equipe — descrever o que o campo faz é seguro, afirmar o que ele deveria fazer não é.

## 2. Solução Proposta

### Visão de produto

- A ajuda mora **onde a dúvida aparece**, não num manual separado: no campo, na tela e, só em último caso, num documento.
- A ajuda é **camada, não muro**: quem já sabe operar não deve esbarrar nela; quem não sabe não deve precisar procurar.
- O seller opera **no celular, entre uma entrega e outra**. Toda decisão de interface parte disso: sem hover, sem parede de texto, com opção de ouvir em vez de ler.
- A plataforma tem **um assistente que já conhece as regras de negócio**. Quando a ajuda estática não resolve, a saída é ele, não um formulário de suporte.
- O mascote dá **rosto** à ajuda — mas aparece uma vez por tela, nunca ao lado de cada campo.

### Decisões de produto

1. **Ajuda por campo com dois pesos.** Texto fixo onde errar custa dinheiro; ícone "?" no clique para o resto. Motivo: texto fixo em 21 campos dobraria a altura do formulário de produto no celular, e hover não existe em toque.
2. **Um mascote por tela, não um por campo.** Motivo: 21 repetições da mesma foto viram ruído (efeito Clippy) e peso de página. Decisão da dona em 14/09/2026, depois de considerar a alternativa de pôr o mascote em cada campo.
3. **Tela sem tópico correspondente no manual não ganha botão de ajuda.** Motivo: painel vazio ou texto inventado é pior que ausência. Coletiva, leilão, crédito, disputas, reputação, rotas e carrinhos abandonados estão nesse caso e entram quando o conteúdo de negócio existir.
4. **Conteúdo escrito a partir do código nasce como rascunho visível**, com a etiqueta "Explicação preliminar, em revisão pela equipe". Motivo: a regra do projeto proíbe inventar regra de negócio, e um texto não revisado sendo lido como oficial é um risco maior que a falta dele.
5. **O convite da primeira visita não some sozinho e volta em visitas futuras.** Fechar silencia aquela tela enquanto o navegador estiver aberto. Decisão da dona em 14/09/2026, corrigindo a primeira versão, em que dispensar uma vez calava o convite para sempre em todas as telas.
6. **A narração usa a voz clonada da dona**, gerada localmente, e não voz sintética de navegador nem TTS pago. Motivo: qualidade e identidade de marca. Decisão dela em 14/09/2026, revertendo a escolha anterior. A voz do navegador permanece apenas como rede de segurança para passo ainda não gravado.
7. **A busca da Central roda no navegador**, sem índice, servidor ou dependência nova. Motivo: o manual inteiro já vem no bundle da página; qualquer coisa além disso seria infraestrutura para um problema que não existe nesse tamanho.
8. **Dúvida não resolvida vai para o assistente já existente**, com a pergunta digitada e a persona de seller. Motivo: o bot já conhece as regras da plataforma (PRD 007, PRD 020); construir um segundo caminho de suporte seria duplicar o que já funciona.
9. **A Central mantém as duas formas de acesso**: a página única com âncoras, que já foi a produção, e a rota por tópico. Motivo: o link com âncora já circulou; quebrá-lo para ganhar elegância de URL não se paga.

### Fora do escopo

- **Reescrever o Manual do Seller para o painel reconstruído.** As divergências são registradas (§8); a reescrita é decisão do dono do conteúdo.
- **Conteúdo de negócio novo** para as telas sem tópico (coletiva, leilão, crédito, disputas, reputação, rotas, carrinhos abandonados). Depende de definição comercial, não de software.
- **Ajuda contextual nas áreas de admin, afiliado, parceiro logístico e na vitrine do comprador.** O escopo é o painel do seller. *(premissa — confirme ou corrija)*
- **Vídeo tutorial dentro do painel.** Os vídeos continuam em `/seller/tutoriais`. *(premissa — confirme ou corrija)*
- **Tradução da ajuda para outros idiomas.** O público é fabricante brasileiro. *(premissa — confirme ou corrija)*
- **Métrica de uso da ajuda** (quantos abriram, quais dúvidas mais buscadas). Ver §5b para o que ficou pendente de medição. *(premissa — confirme ou corrija)*
- **Painel para a equipe editar a ajuda pela interface.** O conteúdo é publicado por código nesta entrega. *(premissa — confirme ou corrija)*

## 3. Funcionalidades

### US01: Entender um campo sem sair do formulário

Como seller preenchendo o cadastro de um produto, quero saber o que cada campo significa no momento em que o preencho, para não descobrir o erro depois que o dinheiro já ficou retido.

**Rules:**
- Campo cujo erro bloqueia recebimento, bloqueia checkout ou gera cobrança incorreta exibe a explicação sempre visível, sem exigir clique.
- Os demais campos exibem a explicação atrás de um controle de ajuda acionável por toque e por teclado.
- Explicação escrita a partir do comportamento do código, e não do manual publicado, aparece marcada como preliminar até a revisão da equipe.
- Campo cujo comportamento não pôde ser confirmado fica sem explicação, em vez de receber texto especulativo.
- A mesma explicação serve o painel e o manual, para os dois nunca divergirem.

**Edge cases:**
- Campo sem explicação cadastrada → nada é renderizado; nenhum ícone vazio, nenhum espaço reservado.
- Campo já explicado pelo próprio formulário → não recebe explicação duplicada (é o caso do produto perecível, cuja janela de 24h já está descrita abaixo do controle).
- Tela de listagem com muitas linhas → a explicação não se repete linha a linha.

### US02: Descobrir que existe ajuda naquela tela

Como seller que entra numa tela do painel pela primeira vez, quero perceber que existe ajuda ali, para não concluir sozinho que o sistema é complicado.

**Rules:**
- Cada tela coberta exibe um único ponto de ajuda, identificado pelo mascote e por um rótulo textual.
- O ponto de ajuda não se sobrepõe a nenhum outro elemento flutuante da plataforma, em nenhuma largura de tela.
- Na primeira visita a cada tela, um convite se apresenta junto ao mascote e permanece até ser fechado.
- O convite volta a aparecer em visitas futuras, mas não insiste na mesma sessão depois de fechado.
- Abrir o painel de ajuda conta como convite atendido.
- Tudo que sai do mascote se distingue do fundo da página por cor própria.

**Edge cases:**
- Tela sem conteúdo de ajuda correspondente → não exibe o ponto de ajuda.
- Armazenamento do navegador bloqueado → o convite continua aparecendo e nenhum erro é exibido.
- Tour em andamento → o ponto de ajuda sai de cena para não disputar espaço com o balão do tour.
- Tela estreita de celular → o convite cabe na largura sem gerar rolagem horizontal.

### US03: Ser guiado pelo painel, ouvindo em vez de lendo

Como seller que aprende melhor ouvindo, ou que está com as mãos ocupadas, quero que a plataforma me explique a tela em voz alta, para aprender a operar sem parar o que estou fazendo.

**Rules:**
- O tour pode ser iniciado a partir da tela em que o seller está, começando pelo passo que fala dela.
- Cada passo pode ser ouvido em voz alta, com controle de iniciar e parar.
- A narração é a voz oficial da plataforma, não uma voz genérica de sistema.
- Trocar de passo, encerrar o tour ou sair da página interrompe a narração imediatamente.
- O balão do tour fica sempre inteiramente visível e nunca cobre os controles flutuantes da plataforma.

**Edge cases:**
- Passo sem narração gravada → o texto continua disponível e a leitura recai na voz do sistema, quando houver.
- Nenhuma voz utilizável em português no dispositivo e sem gravação → o controle de ouvir não é oferecido, em vez de existir mudo.
- Seller avança de passo com a narração tocando → a voz do passo anterior para na hora.
- Tela cujo alvo do passo não está visível → o balão assume posição de repouso sem colidir com outros elementos.

### US04: Achar a resposta na Central e, se não achar, perguntar

Como seller com uma dúvida específica, quero buscar por palavra-chave e, quando o manual não cobrir, perguntar a alguém que conheça as regras, para resolver sem abrir chamado e esperar.

**Rules:**
- A busca encontra por palavra digitada com ou sem acento.
- A busca encontra também conteúdo que aparece apenas no corpo do tópico, não só no título.
- O resultado indica de que tópico veio e mostra um trecho, para o seller escolher antes de abrir.
- Busca sem resultado oferece o assistente já com a pergunta digitada, sem o seller precisar repetir.
- O assistente também é oferecido quando há resultados, porque achar tópicos errados é tão comum quanto não achar nada.
- Cada tópico tem navegação para o anterior e o próximo, porque o manual é lido em sequência.
- Os endereços de tópico já publicados continuam válidos.

**Edge cases:**
- Consulta vazia ou curta demais → nenhuma lista de resultados; a página segue mostrando o índice normal.
- Tópico inexistente no endereço → página não encontrada, não página vazia.
- Primeiro e último tópico → exibem apenas a navegação que existe, sem link quebrado.

## 5a. Critérios de Aceite

**Funcionais**
- Todo campo classificado como crítico tem explicação de texto fixo — verificável automaticamente, e a ausência impede a publicação.
- Toda explicação preliminar exibe a marcação de revisão pendente — idem.
- Todo tópico apontado por uma tela existe no manual, e toda tela de dicas referenciada existe na fonte — idem.
- Todo passo do tour tem a narração publicada — idem.
- A busca encontra "logistica" e "logística" com o mesmo resultado, encontra "pix" pelo corpo do tópico de repasse e devolve vazio para termo inexistente.
- Nenhum elemento flutuante da ajuda se sobrepõe ao botão de atendimento em 390px e em 1440px, com o chat aberto e fechado.

**Não-funcionais**
- A ajuda não adiciona requisição de rede ao carregamento de nenhuma tela do painel: dicas e manual viajam no bundle, e a narração só é baixada quando o seller pede para ouvir. Razão de negócio: o seller opera em rede móvel, e ajuda que custa carregamento vira motivo para o painel parecer lento.
- Nenhuma preferência de ajuda é gravada no servidor. Razão: é preferência de interface, e gravá-la criaria dado de usuário sem valor de negócio.

## 5b. Métricas de Sucesso

*(premissa — confirme ou corrija: nenhuma métrica foi instrumentada nesta entrega; os números abaixo são a proposta de medição.)*

| Métrica | Baseline | Meta |
|---|---|---|
| Tickets de suporte sobre "como faço" no painel | não medido | queda perceptível em 60 dias |
| Sellers que completam o cadastro do primeiro produto sem intervenção humana | não medido | maioria |
| Chave PIX ausente em loja ativa (causa conhecida de repasse travado) | não medido | tendendo a zero |

Sem instrumentação, a avaliação nesta rodada é qualitativa: relato do time de captação e da operação.

## 6. Marcos

### Milestone 1 — O campo se explica sozinho
**USs:** US01
**Por que é um marco:** é a primeira vez que o seller consegue preencher o formulário que trava dinheiro sem precisar de alguém do outro lado.
**Aceite:** campo crítico sem explicação impede a publicação; explicação preliminar sai marcada; campo não confirmado fica sem texto.
**Estado:** entregue (PR #610, #620).

### Milestone 2 — A ajuda tem rosto e endereço na tela
**USs:** US02
**Por que é um marco:** a ajuda deixa de ser um lugar aonde se vai e passa a ser algo que se apresenta, tela a tela.
**Aceite:** ponto de ajuda em toda tela coberta, sem sobreposição com o atendimento em nenhuma largura; convite persistente que volta em visitas futuras.
**Estado:** entregue (PR #614, #618, #625, #632, #636, #637).

### Milestone 3 — O painel se explica em voz alta
**USs:** US03
**Por que é um marco:** o tour deixa de ser leitura e vira acompanhamento, na voz da própria plataforma.
**Aceite:** tour iniciável da tela atual; narração gravada em todos os passos; voz interrompida ao trocar de passo, encerrar ou sair.
**Estado:** entregue (PR #625, #627).

### Milestone 4 — A dúvida sempre tem para onde ir
**USs:** US04
**Por que é um marco:** fecha o ciclo da ajuda: o que o manual cobre é encontrável, e o que ele não cobre cai no assistente em vez de virar chamado.
**Aceite:** busca com e sem acento e por corpo do tópico; navegação anterior/próximo; saída para o assistente com a pergunta preservada.
**Estado:** entregue (PR #618, #634).

### Milestone 5 — A ajuda cobre o painel inteiro
**USs:** US01, US02
**Por que é um marco:** enquanto sete telas ficarem sem ajuda, o seller aprende que "às vezes tem ajuda", que é pior que uma regra clara.
**Aceite:** coletiva, leilão, crédito, disputas, reputação, rotas e carrinhos abandonados com tópico no manual e ponto de ajuda na tela; nenhuma explicação restante marcada como preliminar.
**Estado:** pendente — bloqueado por conteúdo de negócio, não por software.

## 8. Registro de Decisões

- **Numeração:** este PRD é o 034 e não o 033 porque existe um PRD 033 (navegação mobile da vitrine) em branch não mergeada, commit `2be9bf2`. Reaproveitar o número criaria colisão no merge.
- **Dependências:** `depends_on: ["007", "020"]`. A saída da Central para o assistente pressupõe o bot multi-persona (PRD 007) e o atendimento já implantado (PRD 020) — a feature entrega a pergunta com a persona de seller e não constrói nada do lado do bot. Nenhum outro PRD foi listado: proximidade de domínio não é dependência.
- **Divergências confirmadas entre o Manual do Seller e o painel reconstruído**, encontradas ao escrever a ajuda:
  1. a lista de produtos **não tem os seis ícones** descritos no manual (lápis, lixeira, caminhão, avião, documento, "+"); o painel atual usa botões de texto. O manual descreve a tela do Bubble legado;
  2. o peso do produto é em **quilogramas**, e o manual diz gramas;
  3. `permite_logistica_afiliado` e `parceiro_logistico_habilitado` são campos **ortogonais**, e o manual trata os dois como "o ícone do avião";
  4. a tela de centro de distribuição **não pede CEP** e a tabela não tem essa coluna, embora o tour afirmasse que o CEP ajuda a calcular o frete. O texto do tour foi corrigido na entrega.
- **Decisão de não instrumentar métricas nesta rodada**, registrada como dívida consciente em §5b. Motivo: a feature nasceu de um problema evidente e recorrente no atendimento, e esperar instrumentação para entregar ajuda seria trocar valor por medida.
- **Decisão sobre tamanho do mascote** revisada duas vezes com a dona em 15/09/2026 (112px → 448px → 224px). Fica registrado que o limite por viewport existe porque o valor cru era mais largo que a tela de um celular.
- **A especificação detalhada de comportamento** vive nas changes OpenSpec listadas em `references`; este PRD é a intenção de produto, não a spec de implementação.

## 9. Referências

- Central em produção: https://industria24.com.br/seller/central-de-duvidas
- Issue guarda-chuva: https://github.com/Schneider-Gr/industria24hIA/issues/608
- Censo das telas sem ajuda: https://github.com/Schneider-Gr/industria24hIA/issues/611
- Changes OpenSpec: `ajuda-contextual-painel-seller`, `ajuda-contextual-demais-telas-seller`, `tour-narrado-e-posicao-ajuda`
- PRDs dependentes: 007 (bot multi-persona), 020 (bot de atendimento)
- Brainstorm de origem: `docs/brainstorm-mascote-dicas-seller.md`
