---
prd_number: "043"
status: rascunho
priority: alta
created: 2026-09-18
issue: ""
depends_on: ["036", "039"]
references:
  - "docs/prds/036-ledger-estoque-multi-local.md"
  - "docs/prds/039-custodia-e-operacao-do-cd-industria.md"
  - "docs/prds/040-tarifacao-da-armazenagem.md"
  - "docs/specs/039-us04-separacao-expedicao.md"
  - "supabase/migrations/0176_estoque_enderecos_armazenagem.sql"
  - "supabase/migrations/0179_venda_futura_no_ledger_e_guardas.sql"
  - "supabase/migrations/0181_estoque_enderecos_lote.sql"
  - "supabase/migrations/0187_reserva_consumida_na_entrega.sql"
---

# PRD 043: Gestão do fulfillment no admin e lojas piloto do CD

## 1. Contexto

- **Produto/área**: operação do CD Indústria (fulfillment), painel administrativo do marketplace.
- **Estado atual**: o ledger de estoque (PRD 036 M1), a reserva no pedido (M2), os endereços de armazenagem (0176), o cadastro em lote de posições (0181) e o CD Indústria Manaus (0178) estão em produção. O CD tem 10 posições cadastradas e **saldo zero**. Nenhum produto pode apontar para ele: a trava da 0179 recusa qualquer produto até o Milestone 3 do PRD 039 existir. Não há tela nenhuma de operação do CD: quem quiser medir saldo, posição ou reserva precisa consultar o banco.
- **Problema**: a LP `/armazeneconosco` já anuncia o programa e promete vagas para lojas piloto, mas a operação não tem como aceitar a primeira loja nem dar entrada na primeira caixa. Sem uma porta controlada, a alternativa é desligar a trava da 0179 para todo mundo, o que libera o CD para 100% do catálogo antes de existir separação, ou operar por SQL manual em produção, que não deixa rastro de quem fez o quê.

> Contexto técnico (stack, RLS, padrões de RPC) vive no TRD e nas migrations citadas em §8.

## 2. Solução Proposta

### Visão de produto

- Trocar a trava binária do CD por uma **porta de entrada controlada**: só lojas explicitamente admitidas no programa podem guardar mercadoria no CD.
- Dar ao admin uma **tela única de operação do CD**, com o que ele precisa ver (posições, saldo, reservas) e fazer (admitir loja, registrar entrada).
- Permitir a **primeira entrada de mercadoria** com posição, para que o piloto comece antes do recebimento formal (US03 do PRD 039) existir.
- Mostrar, sem esconder, a **divergência conhecida** entre o saldo do centro e o saldo por posição, que só se fecha com a separação (US04 do PRD 039).

### Decisões de produto

1. **A admissão é por loja e por centro, não global.** Uma loja admitida no CD de Manaus não fica admitida em outro CD que venha a existir, porque o contrato de armazenagem é por unidade.
2. **A trava da 0179 continua valendo para quem está fora da lista.** Admitir é ato explícito do admin, não consequência de cadastro.
3. **A entrada registrada pelo admin exige posição e motivo.** É a mesma regra da 0176 e 0179: mercadoria no CD do Indústria sem endereço não entra.
4. **A tela é só do admin.** O painel do seller sobre a mercadoria em custódia é a US06 do PRD 039 e não entra aqui. *(premissa — confirme ou corrija)*
5. **A divergência entre centro e posição é exibida, não corrigida.** Corrigir exigiria escolher a posição na venda, que é a US04 do PRD 039.

### Fora do escopo

- **Aviso de recebimento e conferência de entrada (US03 do PRD 039).** A entrada do admin é um substituto operacional enquanto o fluxo formal não existe, e sai quando ele chegar.
- **Separação e expedição (US04 do PRD 039).** Sem ela, a saída continua sem escolher posição.
- **Tarifação e fatura (PRD 040).** Admitir loja no piloto não gera cobrança automática. O contrato é negociado fora do sistema. *(premissa — confirme ou corrija)*
- **Painel do seller (US06 do PRD 039).**
- **Transferência entre posições.** *(premissa — confirme ou corrija)*

## 3. Funcionalidades

### US01: Admitir loja no programa piloto do CD

Como admin, quero admitir uma loja no CD, para que ela possa guardar mercadoria lá sem abrir o CD para o catálogo inteiro.

**Rules:**
- A admissão vale para um par loja + centro.
- Só admin admite e remove.
- Loja admitida pode apontar produtos para aquele centro; loja fora da lista continua recusada com a mensagem da 0179.
- A tela mostra quem admitiu e quando.

**Edge cases:**
- Loja já admitida no mesmo centro → a tela informa e não duplica.
- Remover loja que ainda tem saldo no CD → a remoção é recusada, com o saldo informado. *(premissa — confirme ou corrija)*
- Loja inativa ou em análise → pode ser admitida, mas a tela avisa que ela não vende enquanto não estiver Ativa. *(premissa — confirme ou corrija)*
- Centro que não é do tipo `industria` → a tela não oferece, porque CD de seller não precisa de admissão.

### US02: Registrar entrada de mercadoria no CD

Como admin, quero registrar a entrada de uma quantidade numa posição, para que a mercadoria do piloto exista no sistema antes do recebimento formal.

**Rules:**
- A entrada exige produto, centro, posição, quantidade e motivo.
- A quantidade é positiva e inteira.
- O produto precisa ser de uma loja admitida naquele centro.
- A entrada aparece no ledger e no saldo da posição, e soma no disponível do produto.
- O lançamento é imutável: correção se faz com lançamento contrário, nunca com edição.

**Edge cases:**
- Posição bloqueada → recusa, com a mensagem da 0176.
- Posição de outro centro → recusa.
- Produto de loja não admitida → recusa.
- Quantidade zero ou negativa → recusa. *(premissa — confirme ou corrija)*
- Sem motivo → recusa, para o rastro não nascer vazio.

### US03: Ver o estado do CD

Como admin, quero ver posições, saldo e reservas do CD numa tela, para saber o que está guardado e o que está prometido sem consultar o banco.

**Rules:**
- A tela mostra o centro, o endereço, o CEP, o número de posições e o saldo total.
- Lista as posições com saldo por posição, marcando as bloqueadas.
- Lista as reservas abertas (ativa e confirmada) com pedido, produto, quantidade e status.
- Lista as lojas admitidas com o saldo de cada uma no CD. *(premissa — confirme ou corrija)*

**Edge cases:**
- CD sem posição cadastrada → a tela explica que nada entra sem posição e oferece o cadastro em lote.
- CD com posições e saldo zero → estado vazio explícito, não tabela em branco.
- Nenhum CD do tipo `industria` cadastrado → a tela explica e não quebra.

### US04: Enxergar a divergência entre centro e posição

Como admin, quero ver a diferença entre o saldo do centro e a soma das posições, para saber quanto do estoque já saiu em venda mas continua endereçado.

**Rules:**
- A tela mostra saldo do centro, soma das posições e a diferença, por produto.
- A diferença esperada hoje é igual ao que saiu em vendas, porque a saída não escolhe posição.
- A tela também mostra a paridade do ledger contra `produtos.estoque_atual`, que deve ser sempre zero divergentes.

**Edge cases:**
- Paridade diferente de zero → alerta destacado, porque aí é erro de verdade, não a lacuna conhecida. *(premissa — confirme ou corrija)*
- Soma das posições menor que o saldo do centro → alerta, porque o esperado é o contrário. *(premissa — confirme ou corrija)*

## 4. Fluxo de Negócio

```
Loja quer guardar no CD
   │
   ▼
Admin admite a loja no centro? ──não──▶ Produto recusado pela trava (0179)
   │ sim
   ▼
Produto aponta para o CD
   │
   ▼
Admin registra entrada ──▶ posição informada? ──não──▶ Recusa
   │ sim
   ▼
Saldo no centro + saldo na posição + disponível do produto
   │
   ▼
Venda ──▶ reserva ──▶ entrega ──▶ reserva consumida (0187)
   │
   ▼
Saldo do centro cai; saldo da posição NÃO cai (até a US04 do PRD 039)
   │
   ▼
Painel de divergência mostra a diferença
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|---|---|---|
| Produto de loja admitida aponta para o CD; produto de loja fora é recusado | é a porta que substitui a trava binária sem abrir o CD para todos | cadastrar os dois casos e conferir a mensagem de erro do segundo |
| Entrada sem posição é recusada | mercadoria sem posição é mercadoria que ninguém acha no galpão | tentar a entrada sem posição na tela e receber a recusa da 0176 |
| Entrada válida aparece no ledger, na posição e no disponível do produto | a entrada é a origem de todo o resto | registrar 20 unidades e conferir os três números |
| Remoção de loja com saldo no CD é recusada | sair do programa com mercadoria lá dentro deixa estoque órfão | tentar remover a loja do piloto com saldo e receber a recusa |
| Só admin abre a tela e usa as ações | operação do CD move estoque de terceiro | abrir `/admin/fulfillment` com conta de seller e receber negativa |
| A tela mostra paridade do ledger zerada e a divergência centro vs posição | a lacuna conhecida precisa ser visível, não descoberta em auditoria | comparar os números da tela com a consulta ao banco |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---|---|---|---|---|---|
| Lojas admitidas no CD Manaus | 0 (banco, 18/09/2026) | 5 | 90 dias após o Milestone 1 | 2 | Captação |
| Unidades guardadas no CD | 0 (saldo do centro, 18/09/2026) | 1.000 | 90 dias após o Milestone 1 | 200 | Operação |
| Operações de estoque do CD feitas por SQL manual | 100% hoje (não há tela) | 0% | 30 dias após o Milestone 1 | menos de 10% | Operação |
| Paridade do ledger divergente | 0 (medido 18/09/2026) | 0 | contínuo | 0 | Operação |

## 6. Milestones

### Milestone 1: Abrir o CD para a primeira loja piloto

**Por que é um marco:** a partir dele o programa anunciado na LP existe de fato: uma loja entra, manda carga e a mercadoria fica registrada numa posição do galpão.

**Funcionalidades:** US01, US02

**Checklist de aceite:**
- [ ] Produto de loja admitida aponta para o CD; produto de loja fora é recusado
- [ ] Entrada sem posição é recusada
- [ ] Entrada válida aparece no ledger, na posição e no disponível do produto
- [ ] Remoção de loja com saldo no CD é recusada
- [ ] Só admin usa as ações

**Aprovador:** dona do produto

### Milestone 2: Enxergar a operação do CD sem abrir o banco

**Por que é um marco:** a operação passa a ter um lugar único para responder "o que está guardado, onde, e quanto já está prometido", que é o que sustenta a conversa com o seller.

**Funcionalidades:** US03, US04

**Checklist de aceite:**
- [ ] A tela mostra posições, saldo por posição e reservas abertas
- [ ] A tela mostra paridade do ledger zerada e a divergência centro vs posição
- [ ] Estados vazios explicam o que fazer, em vez de mostrar tabela em branco

**Aprovador:** dona do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Estado |
|---|---|---|---|
| Admitir loja no piloto sem contrato assinado cria custódia sem base jurídica | Alto | admissão é ato manual do admin, feita só depois do contrato do PRD 040 | Em aberto |
| A entrada do admin vira atalho permanente e a US03 do PRD 039 nunca é feita | Médio | a tela declara que é operação de piloto; sai quando o recebimento existir | Em aberto |
| A divergência entre centro e posição ser lida como bug e alguém "corrigir" o saldo à mão | Médio | a própria tela explica a origem da diferença e aponta a US04 | Em aberto |
| Mercadoria de terceiro no galpão sem seguro, com avaria de responsabilidade do seller | Alto | decisão registrada no PRD 040; contrato precisa dizer isso com todas as letras | Em aberto |

| Dependência | Tipo | Estado | Observação |
|---|---|---|---|
| PRD 036, Milestone 1 e 2 (ledger e reserva) | Interna | Em produção desde 16/09/2026 | — |
| PRD 039, Milestone 2 (endereços e CD cadastrado) | Interna | Em produção desde 16/09/2026 | 10 posições em Manaus |
| PRD 039, US03 (recebimento) | Interna | Não entregue | a US02 daqui é o substituto temporário |
| PRD 039, US04 (separação) | Interna | Não entregue | enquanto não existir, o saldo por posição não cai na venda |
| Contrato de depósito do PRD 040 | Externa | Em aberto | bloqueia admitir loja real, não a loja de teste |

## 8. Referências

- PRD 036: ledger de estoque multi-local
- PRD 039: custódia e operação do CD Indústria
- PRD 040: tarifação da armazenagem
- Spec da US04: `docs/specs/039-us04-separacao-expedicao.md`
- Migrations 0176 (endereços), 0179 (trava do CD), 0181 (posições em lote), 0187 (reserva consumida na entrega)
- Roteiro de teste no sandbox: `ROTEIRO_teste_armazenagem_cd_sandbox.md` (fora do repo)

## 9. Registro de Decisões

- **2026-09-18:** a trava do CD deixa de ser binária e passa a ser lista de lojas admitidas. Motivo: a LP já vende o piloto, e as alternativas eram abrir o CD para todo o catálogo antes da separação existir ou operar por SQL manual sem rastro.
- **2026-09-18:** a entrada de mercadoria pelo admin entra como substituto explícito da US03 do PRD 039, com prazo de validade declarado. Motivo: sem entrada não há piloto, e a US03 depende de decisões fiscais que não estão fechadas.
- **2026-09-18:** a divergência entre saldo do centro e saldo por posição é exibida em vez de corrigida. Motivo: corrigir exige escolher posição na venda, que é a US04 e mexe na `checkout_criar_pedido`, no caminho do dinheiro.
- **2026-09-18:** `depends_on` traz 036 e 039 porque esta feature pressupõe o ledger, a reserva, os endereços e a trava do CD. O 040 fica só em referências: o contrato condiciona admitir loja real, mas nenhum comportamento desta feature depende do texto dele.
