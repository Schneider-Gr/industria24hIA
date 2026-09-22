---
prd_number: "046"
status: rascunho
priority: crítica
created: 2026-09-22
issue: ""
depends_on: ["036", "039"]
references:
  - "docs/prds/039-custodia-e-operacao-do-cd-industria.md"
  - "docs/prds/036-ledger-estoque-multi-local.md"
  - "docs/prds/040-tarifacao-da-armazenagem.md"
  - "docs/prds/045-separacao-e-expedicao-no-cd.md"
  - "supabase/migrations/0176_estoque_enderecos_armazenagem.sql"
  - "supabase/migrations/0179_produto_centro_recusa_industria.sql"
  - "supabase/migrations/0190_cd_lojas_piloto_e_entrada_admin.sql"
  - "src/app/armazeneconosco/page.tsx"
---

# PRD 046: Recebimento e conferência no CD Indústria

## 1. Contexto

- **Produto/área**: fulfillment do Indústria 24h. É a US03 do PRD 039, a porta de entrada da custódia.
- **Estado atual**: o CD Indústria Manaus existe, com 10 posições cadastradas e **saldo zero**: nenhuma mercadoria entrou no galpão. A única forma de dar entrada é um administrador preencher um formulário com produto, posição, quantidade e motivo. Não existe aviso prévio de carga, não existe conferência registrada, não existe tratamento de divergência, e o seller não participa de nada disso.
- **Problema**: sem recebimento, todo o resto do fulfillment é teoria. Nada pode ser separado (PRD 045), nada pode ser tarifado (PRD 040) e o piloto não sai do papel, porque não há mercadoria guardada. Pior: a entrada manual de hoje aceita qualquer número digitado por um admin, o que é exatamente o modelo que o ledger foi construído para eliminar. Como por contrato a avaria e o extravio são do seller, a quantidade que entra é o marco zero da responsabilidade: se ela for um número digitado sem conferência, não há como apurar nada depois.

> Contexto técnico vive no TRD. A restrição de que todo lançamento no CD exige endereço vem da migration 0176, e a de que produto só pode ser apontado ao CD a partir do M3 vem da 0179.

## 2. Solução Proposta

### Visão de produto

- O seller **anuncia a carga antes de despachar**, dizendo o que e quanto vem. Isso cria um documento que os dois lados acompanham.
- Na chegada, um operador identificado **confere item a item**. A quantidade que entra no estoque é a conferida, nunca a declarada.
- **Divergência entre declarado e conferido é registrada com motivo**, fica visível para o seller e não vira saldo enquanto não for resolvida.
- A mercadoria conferida é **endereçada numa posição** do galpão, e só então vira saldo vendável.
- O seller enxerga o resultado de cada recebimento sem precisar pedir.

### Decisões de produto

1. **O que vale é a quantidade conferida, não a declarada.** É a promessa que a LP faz e a única base defensável para cobrança e para apuração de avaria.
2. **Mercadoria só vira saldo vendável depois de endereçada.** Enquanto estiver conferida e não endereçada, ela existe no documento de recebimento mas não é oferecida na vitrine — vender o que ninguém sabe onde está gera ruptura na separação.
3. **Divergência não trava a carga inteira.** O que bateu é endereçado e vendido; só a quantidade divergente fica retida até a resolução. Travar tudo puniria o seller pelo erro de um item.
4. **Produto fora do aviso é recebido à parte** e só vira saldo depois que o seller confirmar. Recusar na doca gera custo de devolução; aceitar em silêncio gera estoque que o seller não reconhece.
5. **Quem confere não é quem declara.** O seller declara, o operador confere. Isso é o que dá valor ao número.
6. **Sem contrato assinado, o CD não recebe.** Já está dito na LP como requisito, e é o que dá amparo à custódia.
7. **Operador do CD = admin na v1** *(premissa — confirme ou corrija, mesma premissa do PRD 045)*.

### Fora do escopo

- **Separação e expedição** (PRD 045): esta feature termina quando a mercadoria está guardada e vendável.
- **Tarifação da entrada e da armazenagem** (PRD 040): o recebimento produz os fatos que serão cobrados, mas não calcula valor.
- **Controle de lote e validade**: a LP já diz que a primeira fase não tem isso. Perecível exige conversa antes do envio.
- **Frete até o CD e agendamento de doca**: o seller despacha por conta própria *(premissa — confirme ou corrija)*.
- **Conferência por leitura de código de barras**: a v1 confere contando e digitando *(premissa — confirme ou corrija)*.
- **Devolução de comprador entrando no estoque**: citada na LP, mas é fluxo próprio, com origem e responsabilidade diferentes *(premissa — confirme ou corrija)*.

## 3. Funcionalidades

### US01: Anunciar a carga antes de despachar

Como seller em custódia, quero registrar o que vou enviar ao CD, para que a equipe saiba o que esperar e eu tenha um documento a acompanhar.

**Rules:**
- O aviso lista produto e quantidade declarada, e recebe um identificador que o seller usa para acompanhar.
- Só loja admitida no piloto daquele centro pode criar aviso.
- Só produto já cadastrado na loja pode entrar no aviso.
- O seller pode editar ou cancelar o aviso enquanto a carga não chegou.

**Edge cases:**
- Loja sem contrato assinado → o sistema não deixa criar o aviso e explica o motivo *(premissa — confirme ou corrija: hoje não há registro de contrato no schema)*.
- Carga chega sem aviso nenhum → o operador cria o aviso na chegada, em nome da loja, e isso fica registrado como recebimento sem aviso prévio.
- Aviso aberto há muito tempo sem a carga chegar → fica destacado para a equipe e pode ser cancelado *(premissa — confirme ou corrija: prazo a definir)*.

### US02: Conferir a carga na chegada

Como operador do CD, quero conferir cada produto que chega contra o aviso, para que o estoque nasça de uma contagem e não de um número digitado.

**Rules:**
- A conferência é item a item, com registro de quem conferiu e quando.
- A quantidade conferida é a que vale para o estoque, a cobrança e a responsabilidade.
- Enquanto a conferência não termina, nada da carga vira saldo vendável.
- Produto que veio sem estar no aviso é registrado à parte, como item não previsto.

**Edge cases:**
- Conferido menor que declarado → registra falta com motivo (US03).
- Conferido maior que declarado → registra sobra com motivo, e a diferença segue o mesmo tratamento da falta.
- Produto chega avariado → é conferido como avaria, com motivo, e não vira saldo vendável; por contrato a perda é do seller.
- Conferência interrompida e retomada depois → o já conferido é preservado, sem recontagem.

### US03: Tratar a divergência

Como seller, quero ver e resolver qualquer diferença entre o que enviei e o que foi conferido, para não descobrir depois que meu estoque não bate.

**Rules:**
- Toda divergência exige motivo e fica visível para o seller com o resultado da conferência.
- A quantidade divergente não vira saldo vendável nem é cobrada enquanto não for resolvida.
- A resolução é explícita: o seller aceita a quantidade conferida, ou abre contestação.
- O que não é divergente segue normalmente para o endereçamento.

**Edge cases:**
- Seller não responde à divergência → após o prazo, prevalece a quantidade conferida, e isso é dito na tela desde o início *(premissa — confirme ou corrija: prazo e regra de silêncio precisam da sua decisão)*.
- Divergência de item não previsto → o seller decide entre incorporar ao estoque ou solicitar devolução.
- Contestação aberta → a quantidade fica retida até a decisão do administrador.

### US04: Endereçar a mercadoria conferida

Como operador do CD, quero guardar cada item numa posição do galpão, para que depois alguém consiga achar o que vender.

**Rules:**
- Todo item conferido é endereçado numa posição não bloqueada do centro.
- A mesma quantidade pode ser distribuída em mais de uma posição.
- Só depois de endereçado o item vira saldo vendável na vitrine.
- Cada endereçamento registra quem guardou e quando.

**Edge cases:**
- Não há posição livre suficiente → a carga fica conferida e pendente de endereçamento, destacada para a equipe, e não é vendida.
- Posição escolhida está bloqueada → recusada, com a lista das disponíveis.
- Item avariado ou em divergência → não pode ser endereçado como vendável.

### US05: Acompanhar o recebimento

Como seller em custódia, quero ver o estado e o resultado de cada carga que enviei, para saber o que já está valendo como estoque.

**Rules:**
- O seller vê seus avisos e, por carga, o declarado, o conferido, a divergência e o que já está endereçado.
- O seller vê apenas as próprias cargas.
- O seller não confere, não endereça e não altera quantidade.

**Edge cases:**
- Carga ainda em conferência → o seller vê o andamento parcial, marcado como não final.
- Loja removida do piloto com carga em andamento → o acompanhamento continua visível, porque a mercadoria dela ainda está no galpão.

## 4. Fluxo de Negócio

```
Seller anuncia a carga (produtos + quantidades)
   │
   ▼
Carga chega ao CD ──▶ Operador confere item a item
   │
   ├── bateu ──▶ Endereça na posição ──▶ Vira saldo vendável
   │
   ├── faltou / sobrou ──▶ Registra divergência com motivo
   │                          │
   │                   Seller aceita? ──┬── sim ──▶ Endereça a quantidade conferida
   │                                    └── não ──▶ Contestação ──▶ decisão do admin
   │
   └── item não previsto ──▶ Recebido à parte ──▶ Seller confirma? ──┬── sim ──▶ Endereça
                                                                     └── não ──▶ Devolução
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Quantidade que entra no estoque é a conferida, mesmo quando difere da declarada | É a promessa pública da LP e a base da cobrança e da apuração de avaria | Declarar 100, conferir 95 e verificar que o saldo sobe 95 |
| Mercadoria conferida e não endereçada não é vendável na vitrine | Vender o que ninguém sabe onde está gera ruptura na separação | Conferir sem endereçar e conferir que o produto não aparece disponível |
| Quantidade em divergência não vira saldo nem é cobrada até a resolução | A LP promete isso explicitamente ao seller | Gerar divergência e checar saldo e base de cobrança |
| Divergência sem motivo é recusada | Sem motivo não há como apurar responsabilidade depois | Tentar registrar divergência sem preencher motivo |
| Toda conferência e endereçamento registra autor e horário | Avaria e extravio são do seller por contrato; sem autoria não há apuração | Conferir os registros após cada ação |
| Item avariado não vira saldo vendável | Vender avaria gera cancelamento e disputa com o comprador | Receber item como avaria e checar a vitrine |
| Loja fora do piloto não consegue criar aviso nem receber | A admissão ao piloto é a trava que já existe no banco | Tentar com loja não admitida |
| Seller não vê carga de outra loja | Vazamento entre sellers concorrentes | Autenticar como seller B e tentar ler carga do seller A |
| Saldo do centro e soma das posições batem após o recebimento | Divergência permanente inviabiliza cobrar armazenagem | Rodar a conferência de paridade após endereçar |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Cargas recebidas com divergência | A levantar (nenhuma carga recebida até hoje) | menos de 10% | 60 dias de piloto | 20% | Dona |
| Tempo entre chegada e mercadoria vendável | A levantar | mesmo dia | 60 dias de piloto | 2 dias úteis | Dona |
| Divergências resolvidas sem contestação | A levantar | 90% | 60 dias de piloto | 70% | Dona |

## 6. Milestones

### Milestone 1: Abrir o galpão

**Por que é um marco:** é a primeira vez que mercadoria de seller entra no CD por um processo, com contagem e endereço, em vez de um número digitado por um admin. É o que destrava todo o resto do fulfillment.

**Funcionalidades:** US01, US02, US04

**Checklist de aceite:**
- [ ] A quantidade que entra é a conferida, mesmo diferindo da declarada
- [ ] Conferido e não endereçado não é vendável
- [ ] Toda conferência e endereçamento registra autor e horário
- [ ] Loja fora do piloto não cria aviso nem recebe
- [ ] Saldo do centro e soma das posições batem após o recebimento

**Aprovador:** Dona

### Milestone 2: Fechar a conta da divergência

**Por que é um marco:** o seller passa a ter a garantia que a LP anuncia: diferença aparece com motivo, não vira saldo nem cobrança sozinha, e tem um caminho de resolução.

**Funcionalidades:** US03

**Checklist de aceite:**
- [ ] Quantidade em divergência não vira saldo nem é cobrada até a resolução
- [ ] Divergência sem motivo é recusada
- [ ] Item avariado não vira saldo vendável

**Aprovador:** Dona

### Milestone 3: Dar o extrato ao seller

**Por que é um marco:** o seller deixa de depender da equipe para saber o que está guardado. É a tela que a LP promete como "vem em seguida".

**Funcionalidades:** US05

**Checklist de aceite:**
- [ ] O seller vê declarado, conferido, divergência e endereçado por carga
- [ ] Seller não vê carga de outra loja
- [ ] Seller não confere, não endereça e não altera quantidade

**Aprovador:** Dona

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Produto ainda não pode ser apontado ao CD: a trava da 0179 vale até o M3 do PRD 039 | Alto | Liberar a trava faz parte desta feature; sem isso a mercadoria entra mas não vende | Pendente |
| Não existe registro de contrato assinado no sistema, e a LP o exige | Médio | Controle manual no piloto; decidir com a dona se vira campo ou documento | Pendente |
| Conferência vira formalidade: operador confirma o declarado sem contar | Alto | Autoria e horário por item; acompanhar taxa de divergência zero como sintoma, não como sucesso | Monitorando |
| Regra de silêncio do seller na divergência não definida | Médio | Decisão da dona antes do Milestone 2 | Pendente |
| Galpão com 10 posições pode não comportar a primeira carga real | Médio | Cadastro de posições em lote já existe; dimensionar antes do primeiro envio | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 039, custódia e operação do CD | Interna | Rascunho, com M1 e M2 em produção | Esta feature é a US03 dele |
| PRD 036, ledger de estoque multi-local | Interna | Em produção | A entrada é lançamento no ledger; a regra vem de lá |
| Contrato de depósito | Externa | Pendente | Bloqueia receber mercadoria real, não a construção |
| Decisão da dona sobre operador do CD, prazo de silêncio e contrato | Interna | Pendente | Milestones 1 e 2 |
| PRD 045, separação e expedição | Interna | Rascunho | Não bloqueia esta, mas é bloqueado por ela |

## 8. Referências

- [PRD 039, custódia e operação do CD](039-custodia-e-operacao-do-cd-industria.md) — esta feature é a US03 dele
- [PRD 045, separação e expedição](045-separacao-e-expedicao-no-cd.md) — o outro lado do fluxo, bloqueado por esta
- [PRD 036, ledger de estoque multi-local](036-ledger-estoque-multi-local.md) — regra de lançamento e saldo
- [PRD 040, tarifação da armazenagem](040-tarifacao-da-armazenagem.md) — cobra a entrada e a guarda que esta feature produz
- `src/app/armazeneconosco/page.tsx` — a LP que anuncia este processo ao seller; qualquer mudança de regra aqui precisa ser refletida lá
- `supabase/migrations/0190_cd_lojas_piloto_e_entrada_admin.sql` — a entrada manual de hoje, que esta feature substitui

## 9. Registro de Decisões

- **2026-09-22:** Vale a quantidade conferida, não a declarada. Motivo: é a promessa pública da LP e a única base defensável para cobrança e para apurar avaria, que por contrato é do seller.
- **2026-09-22:** Mercadoria só vira vendável depois de endereçada. Motivo: vender o que não tem posição conhecida transfere o problema para a separação, onde ele vira ruptura com o comprador.
- **2026-09-22:** Divergência retém só a parte divergente. Motivo: travar a carga inteira puniria o seller pelo erro de um item.
- **2026-09-22:** Produto fora do aviso é recebido à parte e depende de confirmação do seller. Motivo: recusar na doca gera custo de devolução, e aceitar em silêncio cria estoque que o seller não reconhece.
- **2026-09-22:** `depends_on` = 039 e 036. Motivo: o 039 define o CD e a custódia, o 036 define o lançamento e o saldo. O 045 não é dependência, é dependente.
- **2026-09-22:** Prioridade crítica. Motivo: é o único bloqueio que impede validar qualquer outra peça do fulfillment com dado real — o galpão está com saldo zero.
