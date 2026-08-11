---
prd_number: "014"
status: rascunho
priority: alta
created: 2026-08-11
issue: ""
depends_on: ["012", "013"]
references:
  - "https://jam.dev/c/91830ec8-a9f2-4a11-b4ca-986fcb145a9e"
---

# PRD 014: Checkout PIX em sessão única (unificação criação de pedido + cobrança)

## 1. Contexto

- **Produto/área**: Checkout do comprador em industria24.com.br — jornada de confirmação do pedido até a exibição do QR code PIX.
- **Estado atual**: Conforme documentado no PRD 012, criação do pedido e geração da cobrança PIX são duas Server Actions desacopladas em duas páginas diferentes (`/checkout` → `finalizarCompra`, depois `/pedido/{id}` → `gerarCobranca`), sem nenhum identificador de sessão amarrando as duas etapas, e cada uma pede nome/CPF de novo ao comprador. Quando a geração automática de cobrança falha (best-effort), o comprador cai em uma segunda tela com formulário duplicado e um botão isolado, sem nenhum feedback de progresso — só sucesso silencioso (troca para QR) ou, no caso do PRD 013, travamento sem resposta.
- **Problema**: Esse desenho em duas telas desacopladas é a origem estrutural de dois problemas observados: (1) o comprador pode ficar com um pedido criado e nenhum caminho claro para pagar, e (2) a experiência não comunica progresso — o comprador não sabe se algo está acontecendo. O benchmark do Mercado Livre (vídeo Jam analisado ao vivo pela própria usuária, ver §8) mostra o padrão oposto: uma única sessão de checkout (`session_id` persistente em toda a URL) atravessa revisão → pagamento → finalização como sub-etapas da mesma jornada, sempre com uma tela de progresso explícita antes do QR, nunca duas ações desacopladas pedindo os mesmos dados duas vezes.

> Este PRD depende do PRD 013 estar resolvido: não faz sentido investir em unificar a experiência de uma etapa que hoje pode travar sem responder. A ordem de execução recomendada é 010 primeiro, 011 depois — ver §7.

## 2. Solução Proposta

### Visão de produto

- Tratar confirmação do pedido e geração da cobrança PIX como uma única jornada de checkout, com um único formulário de identificação do comprador (não dois).
- Mostrar um estado de progresso explícito ("gerando sua cobrança...") entre a confirmação e a exibição do QR code, em vez de alternar silenciosamente entre "formulário" e "QR" sem transição visível.
- Eliminar a segunda tela de "gerar cobrança manualmente" como experiência normal do fluуxo — ela deixa de ser o caminho padrão e vira apenas uma tela de recuperação, para o raro caso em que a geração automática realmente precise ser repetida.

### Decisões de produto

1. O formulário de nome/CPF/WhatsApp é preenchido uma única vez, no checkout — a página do pedido não pede esses dados de novo quando eles já foram informados. *(premissa — confirme ou corrija: pressupõe que os dados do checkout são suficientes para a cobrança Asaas, sem necessidade de confirmação adicional)*
2. A geração da cobrança PIX passa a fazer parte do fluxo síncrono percebido pelo comprador (com tela de progresso), mesmo que a implementação técnica continue assíncrona nos bastidores — decisão de arquitetura fica para TRD/ADR, não aqui.
3. Se a geração da cobrança falhar mesmo com a correção do PRD 013 (timeout tratado), o comprador é levado a uma tela de erro específica com botão "Tentar novamente", não de volta ao formulário de dados pessoais.

### Fora do escopo

- Correção do travamento técnico em si — está no PRD 013, pré-requisito deste.
- Suporte a Boleto e Cartão nesta unificação — este PRD cobre o caminho PIX, mesmo escopo do PRD 012. *(premissa — confirme ou corrija: se a unificação valer para todas as formas de pagamento, isso amplia o escopo)*
- Checkout multiloja com carrinho parcial (escolher quais itens entram nesta compra, como o ML permite no carrinho) — não foi observado como necessidade hoje, fica registrado como ideia futura.
- Persistência de endereço/cartão salvos entre compras — fora do escopo desta melhoria pontual de UX do PIX.

## 3. Funcionalidades

### US01: Preencher dados do comprador uma única vez

Como comprador, quero informar meus dados de identificação (nome, CPF/CNPJ, WhatsApp) uma única vez durante a compra, para não repetir informação já dada.

**Rules:**
- Os dados coletados no formulário de checkout (`/checkout`) são os mesmos usados para criar o cliente Asaas e gerar a cobrança — não há um segundo formulário pedindo os mesmos campos na página do pedido.
- Se o comprador já tem um cliente Asaas vinculado (`asaas_clientes`) de uma compra anterior, os dados não precisam ser preenchidos de novo — a cobrança é gerada usando o cadastro existente. *(premissa — confirme ou corrija: comportamento de reuso de cliente Asaas já existe hoje em `ensureCustomer`, mas não foi confirmado se ele evita re-pedir os dados na UI)*

**Edge cases:**
- CPF informado no checkout diverge do CPF já cadastrado no Asaas para este comprador → *(premissa — confirme ou corrija: tratar como atualização do cadastro ou como erro de validação é uma decisão de produto ainda em aberto)*.

### US02: Ver progresso da geração da cobrança em tempo real

Como comprador, quero ver uma indicação clara de que minha cobrança PIX está sendo gerada, para saber que a compra está em andamento e não precisar adivinhar.

**Rules:**
- Ao confirmar o pedido, o comprador vê uma tela ou estado de "gerando cobrança..." antes de a cobrança PIX ser exibida — nunca uma transição silenciosa nem uma tela em branco.
- O estado de progresso permanece visível até a cobrança ser gerada com sucesso (mostra QR) ou falhar de forma tratada (mostra erro específico, ver US03).
- Este estado de progresso é o comportamento normal do fluxo — não depende de a geração automática ter falhado primeiro, como acontece hoje.

**Edge cases:**
- Geração leva mais tempo que o esperado mas ainda dentro do limite tratado pelo PRD 013 → estado de progresso permanece visível, sem parecer travado (indicador de atividade contínuo, não estático). *(premissa — confirme ou corrija)*

### US03: Recuperar de uma falha sem perder o pedido nem repetir dados

Como comprador, quero poder tentar gerar a cobrança de novo se a primeira tentativa falhar, sem precisar preencher meus dados outra vez nem perder o pedido já criado.

**Rules:**
- Em caso de falha tratada (ver PRD 013), o comprador vê uma tela de erro específica com um botão "Tentar novamente", que reaproveita os dados já informados no checkout.
- O pedido permanece criado e visível em "Meus Pedidos" independentemente do resultado da geração de cobrança.
- Esta tela de recuperação é a única situação em que a "segunda tela" de geração manual de cobrança aparece — deixa de ser o caminho padrão.

**Edge cases:**
- Comprador fecha a aba durante a falha e volta mais tarde pela lista de pedidos → encontra a mesma tela de recuperação com o botão "Tentar novamente", não precisa refazer o checkout do zero.

## 4. Fluxo de Negócio

```
Comprador confirma pedido (dados preenchidos uma única vez)
   │
   ▼
Pedido criado (Aguardando Pagamento)
   │
   ▼
Estado "gerando cobrança..." (progresso visível)
   │
   ▼
Geração da cobrança PIX (com timeout tratado — PRD 013)
   │
   ├── sucesso ──▶ Mostra QR / link PIX
   │
   └── falha tratada ──▶ Tela de erro específica
                              │
                              ▼
                        "Tentar novamente" (reaproveita dados)
                              │
                              ▼
                        volta para "gerando cobrança..."
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Comprador nunca vê o formulário de nome/CPF mais de uma vez durante uma compra bem-sucedida | Elimina a fricção e a impressão de retrabalho que motivou este PRD | Percorrer o fluxo completo (checkout → QR) e contar quantas vezes o formulário de identificação aparece: deve ser 1 |
| Estado de progresso "gerando cobrança" fica visível por no mínimo 300ms mesmo em respostas muito rápidas | Evita "flash" que passa despercebido e comprador continua sem entender que algo aconteceu *(premissa — confirme ou corrija: limiar de UX, não crítico de negócio)* | Gerar cobrança em ambiente com resposta instantânea (mock) e confirmar que o estado de progresso é perceptível |
| Tela de recuperação após falha preserva os dados do comprador sem exigir novo preenchimento | Evita abandono da compra por fricção repetida após uma falha já frustrante | Forçar falha controlada em ambiente de teste, verificar que "Tentar novamente" não pede os dados de novo |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Taxa de conclusão do checkout (pedido criado → QR exibido) sem passar pela tela de recuperação | A levantar — depender da correção do PRD 013 primeiro para ter baseline confiável | ≥ 90% dos pedidos gerando cobrança na primeira tentativa | A definir | 80% | Time de produto/checkout |
| Tempo entre "confirmar pedido" e "QR exibido" percebido pelo comprador | A levantar | p95 < 5s *(premissa — ajustar conforme telemetria real de latência do Asaas)* | A definir | 15s | Time de produto/checkout |

## 6. Milestones

### Milestone 1: Sessão única de identificação do comprador

**Por que é um marco:** Elimina o formulário duplicado, que é a fricção mais visível e mais fácil de perceber pelo comprador — entrega valor perceptível mesmo antes de qualquer mudança na tela de progresso.

**Funcionalidades:** US01

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Formulário de nome/CPF/WhatsApp aparece uma única vez em um checkout completo bem-sucedido

**Aprovador:** Dono do produto / squad de checkout

### Milestone 2: Progresso visível e recuperação sem retrabalho

**Por que é um marco:** Fecha a experiência completa de principio a fim — comprador sempre sabe o que está acontecendo e nunca perde trabalho já feito, equiparando a jornada ao padrão observado no benchmark do Mercado Livre.

**Funcionalidades:** US02, US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Estado de progresso visível em toda geração de cobrança, sucesso ou falha
- [ ] Tela de recuperação após falha nunca pede dados já informados

**Aprovador:** Dono do produto / squad de checkout

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Implementar esta melhoria antes de corrigir o PRD 013 mascara o bug de travamento atrás de uma UI melhor, sem resolver a causa raiz | Alto | Sequenciar explicitamente 010 antes de 011 — não iniciar implementação deste PRD antes do 010 estar em `concluido` ou pelo menos com o timeout tratado validado | Pendente |
| Unificar as duas Server Actions pode exigir mudança na forma como `asaas_cobranca_id` é gravado (hoje via service role, protegido por trigger) | Médio | Investigação técnica fica para TRD — não deve alterar a garantia de segurança do trigger `guard_campos_restritos` | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 013 (bug de geração de cobrança travando) | Interna | Rascunho | Bloqueia início da implementação deste PRD — ver risco acima |
| PRD 012 (fluxo de checkout PIX as-is) | Interna | Rascunho | Fonte do desenho atual que este PRD se propõe a mudar |

## 8. Referências

- [Gravação Jam do checkout PIX do Mercado Livre](https://jam.dev/c/91830ec8-a9f2-4a11-b4ca-986fcb145a9e) — benchmark de UX que inspira este PRD: sessão única (`session_id` persistente) atravessando revisão → pagamento → tela de finalização com progresso explícito (`/checkout/finisher`) antes da confirmação de sucesso (`/checkout/finisher/congrats`), sem formulário duplicado nem etapa desacoplada de geração de cobrança.

## 9. Registro de Decisões

- **2026-08-11:** PRD criado como melhoria de UX distinta do PRD 013, não como parte dele. Motivo: o PRD 013 corrige um defeito (comportamento que já deveria funcionar e não funciona); este PRD 014 propõe uma mudança de experiência sobre um comportamento que, mesmo corrigido, ainda teria a fricção estrutural das duas telas — são unidades de raciocínio de produto diferentes (bug vs. melhoria), mesmo compartilhando a mesma área do sistema.
- **2026-08-11:** Ordem de dependência fixada como 010 antes de 011. Motivo: investir em progresso visual e recuperação elegante sobre uma ação que pode travar sem responder é desperdício de esforço — a base tem que responder de forma confiável antes de a experiência em torno dela ser refinada.
