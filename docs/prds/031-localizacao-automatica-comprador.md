---
prd_number: "031"
status: pronto
priority: alta
created: 2026-09-08
issue: ""
depends_on: ["030"]
references:
  - "PRD 030 — Vitrine por proximidade (geolocalização)"
  - "PR #531 — https://github.com/Schneider-Gr/industria24hIA/pull/531"
  - "PR #535 — reversão: produto fora da faixa de CEP não é exibido"
  - "PR #539 — aviso de quantos produtos o CEP tirou da lista"
  - "Google Geocoding API — reverse geocoding (latlng → CEP)"
---

# PRD 031: Localização automática do comprador

> **Nota de 08/09/2026:** o PRD 030 foi revertido pelo PR #535 e a vitrine voltou a
> ESCONDER o produto fora da faixa de CEP, em vez de rotulá-lo. Este PRD já reflete
> essa regra.

## 1. Contexto

- **Produto/área**: `industria24.com.br`, modal "Onde você está?" da vitrine
  (`CepBar`), porta de entrada da personalização por proximidade definida no PRD 030.
- **Estado atual**: o modal oferece duas vias para o comprador informar onde está —
  digitar o CEP (ViaCEP) ou "Utilizar localização automática" (geolocalização do
  navegador mais reverse geocoding do Google). A via automática ficou **inoperante em
  produção de 04/09 a 08/09/2026** e foi restabelecida nesta sessão.
- **Por que agora**: sem CEP, a vitrine não consegue priorizar o que está perto nem
  esconder o que não chega ao comprador. A via automática é a de menor atrito, e era a
  única quebrada — quem não sabia o próprio CEP de cabeça ficava sem saída.
- **Contexto técnico**: módulo geo em `src/lib/geo.ts` e `src/lib/ceps-geo.ts`.

## 2. Problema

O comprador clicava em "Utilizar localização automática" e recebia
**"Não conseguimos usar sua localização agora. Digite o CEP abaixo."**, sempre.

A causa raiz foi apurada em produção nesta sessão:

1. Reprodução ao vivo com geolocalização simulada em Manaus mostrou que o server
   action respondia pelo ramo genérico de erro, e não por "sem CEP nesse ponto".
2. A tabela de cache `ceps_geo` estava com **zero linhas** — nenhuma chamada à
   Geocoding API jamais teve sucesso em produção, o que descartava intermitência e
   estouro de cota.
3. Um deploy de preview da mesma branch **funcionava**, resolvendo `69050010,
   Manaus/AM`. Como o código era idêntico, a diferença só podia ser de ambiente.
4. Com a instrumentação em produção, o Google nomeou a causa:
   `status=REQUEST_DENIED — The provided API key is invalid`.

A variável `GOOGLE_MAPS_API_KEY`, criada em Production em 04/09 com uma chave
**inválida**, mascarava a `GOOGLE_MAPS_API`, que é válida e está nos três ambientes,
porque o código fazia `GOOGLE_MAPS_API_KEY ?? GOOGLE_MAPS_API` e `??` só pula
`null`/`undefined`. Preview e Development, que só tinham a segunda, nunca sofreram —
o sintoma existia apenas para o comprador real.

O agravante de produto não foi a chave errada, e sim o **silêncio**: qualquer status
diferente de `OK` virava um erro genérico e a `error_message` do Google era
descartada. Uma credencial trocada custou quatro dias de recurso morto porque
ninguém tinha como saber o que o provedor estava dizendo.

## 3. Objetivo

Garantir que o comprador consiga informar onde está com um clique, e que qualquer
falha da integração de geolocalização seja diagnosticável em minutos, não em dias.

## 4. Escopo

### US01 — Obter o CEP pela localização do navegador

**Como** comprador na vitrine,
**quero** informar onde estou com um clique, sem digitar o CEP,
**para** ver o que chega até mim sem precisar lembrar o número.

**Rules:**
- O botão "Utilizar localização automática" pede a permissão de geolocalização ao
  navegador e, com a coordenada, resolve CEP, cidade e UF por reverse geocoding.
- O resultado é gravado no cookie `cep_comprador` junto com a coordenada exata, para
  não gastar uma segunda chamada geocodificando o CEP de volta.
- Após o sucesso, o modal fecha e a página recarrega, para as listas server-side
  serem reordenadas.
- O CEP obtido por esta via tem exatamente o mesmo efeito do CEP digitado, porque o
  filtro reage ao cookie e não à via de origem: reordena por proximidade e **esconde**
  o produto cuja faixa não cobre o comprador (decisão do dono em 08/09, PR #535).
- Como o comprador não digitou nada, ele precisa saber por que a lista encolheu: a
  vitrine informa quantos produtos ficaram de fora daquele CEP, sem devolvê-los à
  listagem (PR #539).
- A busca do CEP varre **todos** os resultados do reverse geocoding, não apenas o
  primeiro: o CEP costuma aparecer só nos resultados mais específicos, enquanto
  cidade e UF aparecem em qualquer um.

**Edge cases:**
- Navegador sem suporte a geolocalização → "Seu navegador não informa a localização.
  Digite o CEP abaixo."
- Permissão negada ou coordenada indisponível → "Não foi possível obter sua
  localização. Digite o CEP abaixo."
- Coordenada válida mas sem CEP no local → "Não identificamos um CEP na sua
  localização. Digite o CEP abaixo."
- Integração de mapas não configurada → "A localização automática ainda não está
  disponível aqui. Digite o CEP abaixo." — o comprador não é culpado por uma
  pendência de configuração.
- Falha do provedor (chave inválida, cota, indisponibilidade) → mensagem genérica ao
  comprador **e** registro do status real no log do servidor.
- Coordenada não finita → rejeitada antes de qualquer chamada paga.

### US02 — Diagnosticar falhas da integração de mapas

**Como** responsável técnico do marketplace,
**quero** que a resposta de erro do Google chegue ao log,
**para** saber em minutos se o problema é chave, cota, API desabilitada ou billing.

**Rules:**
- Toda resposta com `status != OK` do Google registra `status` e `error_message` no
  log do servidor, tanto no forward (`geocodificarCep`) quanto no reverse
  (`enderecoDaCoordenada`).
- O log nunca inclui a chave de API.
- `ZERO_RESULTS` é resposta legítima, não falha de provedor, e não polui o log.
- A escolha da credencial usa a primeira variável **com conteúdo**, não a primeira
  que existe.

**Edge cases:**
- Duas variáveis de credencial definidas, a preferida vazia → usa a que tem conteúdo.
- Ambas vazias ou só espaços → integração reportada como não configurada, sem
  disparar chamada com chave vazia.
- Exceção de rede → registrada como `excecao` com a mensagem, sem derrubar a página.

### US03 — Manter uma única credencial de mapas por ambiente

**Como** responsável pela operação,
**quero** uma só variável de credencial do Google Maps,
**para** que não exista uma chave capaz de mascarar a outra.

**Rules:**
- O projeto mantém `GOOGLE_MAPS_API` como credencial única, presente em Production,
  Preview e Development.
- O código segue aceitando os dois nomes apenas por compatibilidade; a preferência
  não pode reintroduzir mascaramento.
- Rotação de chave acontece nessa entrada única.

**Edge cases:**
- Alguém recriar `GOOGLE_MAPS_API_KEY` com valor inválido → o comportamento volta a
  quebrar em Production e apenas o log denuncia; por isso a variável duplicada foi
  removida em vez de corrigida. **Credencial única é política do projeto** (decisão do
  dono, 09/09/2026), não conveniência temporária.
- Chave válida mas com restrição de API ou billing suspenso → `REQUEST_DENIED` no
  log, mesma via de diagnóstico.

### US04 — Preencher o bairro pela coordenada

**Como** comprador que usou a localização automática,
**quero** que o bairro venha preenchido,
**para** adiantar parte do endereço e reconhecer que o sistema acertou onde estou.

Decisão do dono em 09/09/2026, movendo o bairro de "fora de escopo" para escopo.

**Rules:**
- O reverse geocoding grava o bairro junto com CEP, cidade e UF no cookie
  `cep_comprador`.
- O Google nomeia o mesmo conceito de três formas no Brasil. A ordem de preferência é
  `sublocality_level_1`, depois `sublocality`, depois `neighborhood` — este último
  costuma ser mais granular que o bairro que o comprador reconhece no próprio endereço.
- A rua continua vazia: a coordenada do navegador tem precisão de dezenas de metros e
  chutar logradouro erra a quadra. Bairro é grande o bastante para sobreviver a essa
  imprecisão.
- O bairro não entra em nenhuma regra de cobertura, frete ou filtro — é dado de
  endereço, não de decisão.

**Edge cases:**
- Coordenada em zona rural ou via expressa, sem nenhum dos três componentes → bairro
  vem vazio e o endereço continua válido; ausência de bairro nunca invalida o CEP.
- Bairro presente mas CEP ausente → segue valendo a regra da US01, o endereço é
  recusado por falta de CEP.
- CEP digitado manualmente → o bairro continua vindo do ViaCEP, não do Google.

## 5. Critérios de Aceite

### 5a. Critérios funcionais e não-funcionais

**Funcionais:**
- [x] Clicar em "Utilizar localização automática" com coordenada em Manaus resolve
      `69050010`, grava o cookie com cidade e UF, e o header passa a exibir
      "Enviar para Manaus, AM". *(verificado em produção, 08/09)*
- [x] Nenhuma das mensagens de erro aparece quando a integração está saudável.
      *(verificado)*
- [x] Falha do provedor produz linha `[geo] <função> falhou: status=<status>
      <mensagem>` no log do servidor. *(verificado: o `REQUEST_DENIED` que fechou o
      diagnóstico veio por esse caminho)*
- [x] O cache `ceps_geo` volta a ser populado com coordenadas corretas.
      *(verificado: 4 CEPs, Manaus a -3.11 e Porto Alegre a -30.03)*
- [x] Um ponto sem CEP no resultado principal ainda resolve cidade e UF pela varredura
      dos demais resultados. *(coberto por teste)*

- [x] Coordenada em Manaus com `sublocality_level_1` presente grava o bairro no cookie;
      sem nenhum dos três componentes, o bairro vem vazio sem invalidar o endereço.
      *(coberto por teste)*

**Não-funcionais:**
- [x] A chamada de reverse geocoding respeita o teto diário de **5.000 chamadas**
      (`GEO_MAX_CHAMADAS_DIA`), compartilhado com geocodificação de CEP e cálculo de
      trajeto, porque a cota é da chave e não do endpoint. Limiar confirmado pelo dono
      em 09/09/2026. O contador vive em memória por instância e zera no restart do
      serverless: é freio contra loop, não cota exata.
- [x] A falha da integração nunca lança exceção para a página: o comprador sempre
      recebe o caminho alternativo de digitar o CEP.

### 5b. Métricas de sucesso

- Cliques em "Utilizar localização automática" que terminam em CEP resolvido:
  **0% (04/09 a 08/09) → acima de 90%**, descontadas as recusas de permissão do
  próprio comprador. Meta confirmada pelo dono em 09/09/2026.
- Tempo entre uma falha da integração e a identificação da causa:
  **4 dias → menos de 1 hora**, por existir o status do provedor no log.

## 6. Milestones

### Milestone 1 — Localização automática de volta e à prova de silêncio

**Cobre:** US01, US02, US03.

**Por que é um marco:** o comprador volta a ter a via de menor atrito para dizer onde
está, e a integração deixa de poder falhar em silêncio. É o menor conjunto que se
anuncia como conquista: entregar só o log não devolveria o recurso ao comprador, e
devolver o recurso sem o log deixaria a próxima troca de chave custar outros quatro
dias.

**Checklist de aceite:**
- [x] CEP resolvido pela geolocalização em produção, com cidade e UF no cookie
- [x] Mensagem específica para integração não configurada
- [x] Status e mensagem do Google no log do servidor, sem vazar a chave
- [x] Credencial única por ambiente, sem variável capaz de mascarar outra
- [x] `ceps_geo` voltando a gravar coordenadas corretas
- [ ] Limiar de teto diário confirmado pelo dono

## 7. Fora do escopo

- A regra de esconder ou exibir o produto fora da faixa, que é do PRD 030. Aqui só
  interessa que o CEP obtido automaticamente entra pela mesma porta do digitado.
- O texto e o formato do aviso de produtos omitidos, também do PRD 030 (PR #539).
- Cálculo de frete e prazo, que seguem no checkout.
- Autocompletar a **rua** pela coordenada: a geolocalização do navegador tem precisão
  de dezenas de metros e chutar logradouro erra a quadra. O bairro entrou no escopo
  (US04); a rua continua vazia.
- Persistir a localização na conta do usuário; hoje vive no cookie do navegador e some
  ao trocar de aparelho ou limpar dados. Mantido fora do escopo por decisão do dono em
  09/09/2026.
- Migrar para outro provedor de geocoding.

## 8. Registro de Decisões

- **Remover a variável duplicada em vez de corrigir seu valor** — a chave era
  comprovadamente inválida, não havia o que preservar, e `vercel env pull` não lê
  variáveis Sensitive, então não seria possível restaurá-la. Uma credencial única
  elimina a classe inteira de falha.
- **Mensagem específica para "não configurado"** — culpar a localização do comprador
  por uma pendência de configuração induz o suporte ao erro.
- **Manter a aceitação dos dois nomes de variável** — remover o suporte quebraria
  Preview e Development, que usam a outra. A preferência é que foi corrigida.
- **Log em vez de expor o motivo ao comprador** — o status do Google é informação
  operacional; ao comprador interessa o caminho alternativo, não a causa.
- **`depends_on: ["030"]`** — esta feature é a porta de entrada do CEP que o PRD 030
  consome para ordenar e filtrar. A dependência ficou mais crítica com a reversão de
  08/09: como o 030 agora esconde, um clique em "Utilizar localização automática" pode
  esvaziar a vitrine de quem está fora das faixas cadastradas. Por isso o aviso de
  quantidade omitida (#539) é parte do contrato entre os dois PRDs, não enfeite.

## 9. Referências

- PRD 030 — Vitrine por proximidade (geolocalização)
- PR #531 — instrumentação do erro, varredura do reverse geocoding e escolha da
  credencial com conteúdo
- PR #535 — reversão de 08/09: produto fora da faixa de CEP não é exibido
- PR #539 — aviso de quantos produtos o CEP tirou da lista
- Google Geocoding API, reverse geocoding (`latlng` para `postal_code`)
