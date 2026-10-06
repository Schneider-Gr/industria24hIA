---
prd_number: "058"
status: rascunho
priority: alta
created: 2026-10-05
issue: ""
depends_on: ["001", "056"]
references:
  - "docs/prds/001-confirmacao-entrega-por-codigo-do-comprador.md" – código de 4 dígitos que fecha a entrega e encerra o rastreio
  - "docs/prds/056-entrega-por-parceiro-local-no-checkout.md" – entrega por afiliado logístico, que é quem este PRD rastreia
  - "openspec/changes/entregador-rastreio-zonas-rotas/" – change OpenSpec (grupos 1 a 4 cobrem este PRD)
  - "supabase/migrations/0212_rastreio_posicoes_afiliado_comprador.sql" – quem grava e quem vê a posição
  - "https://github.com/Schneider-Gr/industria24hIA/pull/865" – RLS do rastreio (em produção 05/10/2026)
  - "https://github.com/Schneider-Gr/industria24hIA/pull/866" – envio contínuo e mapa do comprador (em produção 05/10/2026)
  - "https://github.com/fleetbase/fleetbase" – referência de conceito (AGPL-3.0, nenhum código reaproveitado)
---

# PRD 058: Rastreio da entrega em tempo real

## 1. Contexto

- **Produto/área**: logística do marketplace (Manaus), entrega feita por afiliado logístico ou parceiro logístico.
- **Estado atual** (verificado no código em 02/10/2026, antes deste PRD):
  - O comprador paga, o pedido vira corrida e, a partir daí, não tem como saber onde a entrega está. Só vê o código de entrega na página do pedido.
  - Existia o registro de posição da corrida, mas um ponto por clique num botão, e só o parceiro logístico conseguia gravar. O afiliado logístico, que recebe a corrida pelo despacho automático, não gravava nada.
  - O comprador não tinha permissão de ver posição alguma.
  - A confirmação da entrega pelo código do comprador já existe e é obrigatória (PRD 001).
- **Problema**: "cadê meu pedido?" cai no seller ou no WhatsApp da plataforma. O comprador fica ansioso, o seller perde tempo e não há registro do trajeto quando a entrega é contestada.

> **Contexto técnico** no TRD. Implementação descrita na change OpenSpec `entregador-rastreio-zonas-rotas` (decisões D1, D2, D2.1 e D3).

## 2. Solução Proposta

### Visão de produto

- Com o pedido coletado, o comprador vê o entregador se mover no mapa na página do pedido, sem recarregar, com a previsão de chegada.
- O entregador não precisa fazer nada além de manter a tela da corrida aberta: o celular envia a posição sozinho.
- Quando o sinal some, o comprador vê há quanto tempo foi a última posição, em vez de um ponto parado fingindo ser ao vivo.
- O código de entrega continua fechando a entrega, e é ele que encerra o rastreio.
- A área do entregador vira um app instalável no celular, que mantém a tela ligada durante o trajeto.

### Decisões de produto

1. **Fase 1 é PWA, com a tela ligada** (premissa P1 aceita pela dona em 05/10/2026). O rastreio só funciona com o app aberto e a tela ligada; o app nas lojas, com GPS em segundo plano, é o Milestone 3.
2. **Posição a cada 20 segundos ou 50 metros**, o que vier primeiro, e só com a corrida coletada ou em trânsito. Equilibra "parece ao vivo" com bateria do entregador e custo de gravação.
3. **"Ao vivo" até 3 minutos.** Acima disso, o comprador lê "última atualização há N min".
4. **O comprador só vê a posição até a entrega.** Depois que o código confirma, a posição do entregador some para o comprador (privacidade de quem entrega).
5. **O comprador só vê a corrida do próprio pedido**, inclusive quando o pedido vai num lote com outros.
6. **Previsão de chegada recalculada no máximo a cada 2 minutos** por tela aberta: suficiente para o comprador e limita o custo da consulta de rota.
7. **Histórico do trajeto fica gravado**, porque serve de evidência em disputa de entrega (PRD 048).
8. **Fleetbase só como referência.** Nenhum código reaproveitado: a licença AGPL-3.0 obrigaria abrir o código da plataforma.

### Fora do escopo

- Zonas de serviço do entregador (PRD 059).
- Rota com várias entregas e "faltam N entregas antes da sua" (PRD 060).
- Rastreio na página pública `/entregador`, usada por transportador terceiro sem conta: não há usuário a quem autorizar o envio de posição.
- Aviso por WhatsApp ou e-mail de "saiu para entrega" ou "chegando". Pode virar PRD próprio. *(premissa, confirme ou corrija)*
- Rastreio de transportadora e Correios (Melhor Envio), que têm rastreio próprio.

## 3. Funcionalidades

### US01: Entregador compartilha a posição sem esforço

Como afiliado logístico (ou parceiro logístico), quero que meu celular envie minha posição sozinho durante a corrida, para o comprador acompanhar sem me ligar.

**Rules:**
- O envio começa quando a corrida está coletada ou em trânsito, com a tela da corrida aberta, e para fora desses status.
- Um ponto a cada 20 segundos parado, ou antes disso se andou 50 metros ou mais.
- Só o entregador responsável pela corrida consegue enviar posição dela.
- A tela mostra que a localização está sendo compartilhada e a hora do último envio.

**Edge cases:**
- Entregador nega a permissão de GPS → aviso de que o comprador não verá o trajeto; a entrega segue normal.
- Navegador sem GPS → mesmo aviso; nada é enviado.
- Entregador bloqueia a tela e o celular para de enviar → ao voltar para a tela o envio retoma; nenhum ponto é inventado no intervalo.
- Outra pessoa tenta enviar posição da corrida → recusado.
- Corrida já entregue ou cancelada → envio recusado.

### US02: Comprador acompanha a entrega ao vivo

Como comprador, quero ver no mapa onde está o entregador e quando ele chega, para não precisar perguntar ao vendedor.

**Rules:**
- Antes da coleta, a página do pedido diz que o acompanhamento ao vivo aparece quando o entregador coletar.
- A partir do primeiro ponto, o mapa aparece sozinho, sem recarregar, com a rota do entregador até o endereço de entrega.
- Etiqueta "Ao vivo" até 3 minutos desde o último ponto; depois, "última atualização há N min".
- Previsão de chegada em minutos, só enquanto a posição está ao vivo.
- O comprador só vê a corrida do próprio pedido.

**Edge cases:**
- Entregador ainda não enviou posição, mas a corrida já foi coletada → "o entregador ainda não compartilhou a localização; esta tela atualiza sozinha".
- Sinal do entregador cai por 10 minutos → mapa mostra "última atualização há 10 min" e esconde a previsão.
- Serviço de rotas indisponível → mapa e etiqueta continuam; só a previsão some.
- Outro usuário tenta ver a posição do pedido → nada é exibido.
- Pedido de retirada na loja → nenhum bloco de rastreio.

### US03: Código de entrega encerra o rastreio

Como comprador, quero que o rastreio termine quando eu passar o código ao entregador, para que minha entrega fique confirmada e a posição de quem entregou não fique exposta.

**Rules:**
- O código de 4 dígitos continua obrigatório para concluir a entrega (PRD 001).
- Confirmada a entrega, o entregador para de enviar posição e o comprador deixa de ver a posição.
- O repasse continua disparando na confirmação, como hoje.

**Edge cases:**
- Código errado → a entrega não fecha, o rastreio continua e vale o limite de tentativas do PRD 001.
- Corrida cancelada → rastreio encerra do mesmo jeito.

### US04: App do entregador instalável, com tela ligada

Como entregador, quero instalar a área logística como app no celular e que a tela não apague durante a entrega, para o rastreio não parar no meio do caminho.

**Rules:**
- O navegador oferece instalar o app, que abre direto na lista de corridas do entregador.
- Com a corrida em trânsito, o app pede para manter a tela ligada até a corrida sair desse status.
- Se o celular não permitir manter a tela ligada, aparece o aviso "mantenha esta tela aberta e ligada durante a entrega".

**Edge cases:**
- Navegador sem suporte a instalação → a área continua funcionando no navegador, sem o atalho.
- Celular recusa manter a tela ligada (modo economia) → aviso aparece; o envio segue enquanto a tela estiver acesa.

### US05: Rastreio com a tela desligada

Como entregador, quero que o rastreio continue com o celular no bolso, para não precisar dirigir olhando a tela.

**Rules:**
- App publicado nas lojas (Android e iOS), com o mesmo conteúdo da área logística.
- Envio de posição em segundo plano, com as mesmas regras de status e frequência da US01.
- O entregador autoriza a localização em segundo plano explicitamente; sem autorização, vale o comportamento da US04.

**Edge cases:**
- Loja da Apple recusa a localização em segundo plano → segue o PWA da fase 1 até a revisão passar.
- Entregador revoga a autorização no meio da corrida → volta ao comportamento com tela ligada e avisa.

## 4. Fluxo de Negócio

```
Pedido pago → corrida → entregador aceita
   │
   ▼
Entregador marca "coletada"
   │
   ▼
Celular com a tela aberta? ──não──▶ comprador vê "última atualização há N min"
   │sim
   ▼
Envia posição (20 s ou 50 m) ──▶ comprador vê o ponto e a previsão
   │
   ▼
Entregador chega e pede o código
   │
   ▼
Código correto? ──não──▶ rastreio continua (limite de tentativas do PRD 001)
   │sim
   ▼
Entrega confirmada → repasse → posição some para o comprador
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Com a corrida em trânsito e a tela aberta, um novo ponto chega ao comprador em até 30 s após o entregador andar 50 m ou passar 20 s | Abaixo disso não parece ao vivo e o comprador volta a perguntar | Dois aparelhos, entregador andando; cronometrar o mapa do comprador |
| Mapa do comprador atualiza sem recarregar a página | Recarregar manualmente derruba o valor do rastreio | Observar a página aberta durante a corrida |
| Etiqueta muda para "última atualização há N min" após 3 min sem ponto | Ponto parado fingindo estar ao vivo gera desconfiança | Bloquear a tela do entregador por 4 min |
| Afiliado logístico da corrida consegue enviar posição; terceiro não | Só quem entrega pode dizer onde a entrega está | Teste com afiliado, comprador e terceiro (feito em rollback para a 0212) |
| Comprador vê a posição só do próprio pedido e só até a entrega | Privacidade do comprador e do entregador | Comprador A não vê pedido de B; posição some após o código |
| Código errado não encerra o rastreio | A entrega só termina com a pessoa certa | Informar código errado e ver o mapa seguir |
| Previsão de chegada não é pedida mais de uma vez a cada 2 min por tela | Custo da consulta de rota | Observar as chamadas com a página aberta por 10 min |
| App instalável abre na lista de corridas e mantém a tela ligada em trânsito | Tela apagada para o rastreio na fase 1 | Instalar no Android e no iPhone; corrida em trânsito por 5 min sem tocar |
| Com o app das lojas, o rastreio segue com a tela bloqueada | É o que permite o entregador dirigir sem olhar a tela | Bloquear o celular por 5 min em trânsito e ver o mapa do comprador |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Corridas de parceiro local com pelo menos 1 posição registrada | A levantar (0 corridas com posição automática antes de 05/10/2026; volume de corridas pagas a medir no banco) | 80% | 60 dias após o Milestone 1 | 50% | Dona |
| Contatos "cadê meu pedido" por entrega local (WhatsApp da plataforma + chat com seller) | A levantar: dona conta nas conversas dos últimos 30 dias até 31/10/2026 | −50% | 90 dias após o Milestone 1 | −20% | Dona |

## 6. Milestones

### Milestone 1: Comprador acompanha a entrega ao vivo

**Por que é um marco:** é a primeira vez que o comprador vê onde está a entrega dele; anuncia-se como "acompanhe seu pedido no mapa".

**Funcionalidades:** US01, US02, US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Novo ponto chega ao comprador em até 30 s com o entregador em movimento
- [ ] Mapa atualiza sem recarregar
- [ ] "Última atualização há N min" após 3 min sem ponto
- [ ] Afiliado envia posição; terceiro não
- [ ] Comprador vê só o próprio pedido e só até a entrega
- [ ] Código errado não encerra o rastreio
- [ ] Previsão de chegada no máximo a cada 2 min por tela

**Aprovador:** dona

### Milestone 2: App do entregador instalável

**Por que é um marco:** o entregador ganha um ícone na tela inicial e o rastreio para de cair por tela apagada; anuncia-se como "app do entregador".

**Funcionalidades:** US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] App instalável no Android e no iPhone, abrindo na lista de corridas
- [ ] Tela ligada durante corrida em trânsito, com aviso quando o celular não permite

**Aprovador:** dona

### Milestone 3: Rastreio com o celular no bolso

**Por que é um marco:** tira do entregador a obrigação de dirigir com a tela acesa; anuncia-se como "app nas lojas".

**Funcionalidades:** US05

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Rastreio segue com a tela bloqueada por 5 min em trânsito
- [ ] App publicado na Play Store e na App Store

**Aprovador:** dona

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Na fase 1 o rastreio para quando o entregador bloqueia a tela | Alto | Aviso visível, tela mantida ligada em trânsito, comprador vê a idade do último ponto; Milestone 3 resolve | Monitorando |
| Entregador não abre a tela da corrida e o comprador nunca vê o mapa | Alto | Orientar no tutorial do afiliado logístico; métrica de corridas com posição | Pendente |
| Entregador incomodado com a exposição da posição | Médio | Só durante a corrida, só para o comprador daquele pedido, some na entrega | Mitigado |
| Apple recusar localização em segundo plano | Médio | Fase 1 (PWA) continua valendo | Pendente |
| Custo da previsão de chegada com muitas telas abertas | Baixo | No máximo 1 a cada 2 min por tela e teto diário de consultas | Mitigado |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 001, código de entrega | Interna | Em produção | US03 |
| PRD 056, entrega por parceiro local no checkout | Interna | Fase 1 em produção (M1 em 29/09/2026) | Sem corrida de parceiro local, não há o que rastrear |
| Conta de desenvolvedor Apple e Google | Externa | Não contratada | Milestone 3 |

## 8. Referências

- [PRD 001](./001-confirmacao-entrega-por-codigo-do-comprador.md): código de entrega obrigatório.
- [PRD 056](./056-entrega-por-parceiro-local-no-checkout.md): entrega por parceiro local.
- [Change OpenSpec entregador-rastreio-zonas-rotas](../../openspec/changes/entregador-rastreio-zonas-rotas/): specs, design (D1 a D3) e tasks.
- [PR #865](https://github.com/Schneider-Gr/industria24hIA/pull/865): quem grava e quem vê a posição.
- [PR #866](https://github.com/Schneider-Gr/industria24hIA/pull/866): envio contínuo e mapa do comprador.
- [Fleetbase](https://github.com/fleetbase/fleetbase): referência de conceito para rastreio, zonas e rotas.

## 9. Registro de Decisões

- **2026-10-02:** dor principal é o comprador sem saber onde está a entrega; o código de entrega continua obrigatório; app ou PWA; mesmo servidor, sem infraestrutura nova. Motivo: decisão da dona no brainstorm.
- **2026-10-02:** Fleetbase só como referência de conceito. Motivo: AGPL-3.0 obrigaria abrir o código da plataforma, e a stack (PHP/Ember) não se aproveita.
- **2026-10-05:** fase 1 em PWA com tela ligada; app nas lojas vira o Milestone 3. Motivo: premissa P1 aceita pela dona ("siga" após o PR #864).
- **2026-10-05:** escopo do brainstorm dividido em três PRDs: 058 rastreio, 059 zonas de serviço, 060 rota com várias entregas. Motivo: cada parte entrega valor sozinha; aceito pela dona.
- **2026-10-05:** posição some para o comprador depois da entrega. Motivo: privacidade do entregador.
- **2026-10-05:** Milestone 1 implementado e em produção (#865, #866), aguardando verificação ponta a ponta com corrida real. US04 parcial: manter a tela ligada já está no ar; instalação do app (manifest) pendente.
- **Dependências:** 001 porque a US03 usa o código de entrega e o limite de tentativas definidos lá; 056 porque a corrida rastreada é a do parceiro local que o 056 coloca no checkout. PRD 054 não entra: a afiliação por produto não é pressuposta aqui.
