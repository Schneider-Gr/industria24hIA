---
prd_number: "059"
status: rascunho
priority: alta
created: 2026-10-05
issue: ""
depends_on: ["056"]
references:
  - "docs/prds/056-entrega-por-parceiro-local-no-checkout.md" – oferta de parceiro local no checkout e entregador elegível (afiliado aprovado na loja)
  - "docs/prds/058-rastreio-da-entrega-em-tempo-real.md" – PRD irmão do mesmo brainstorm
  - "openspec/changes/entregador-rastreio-zonas-rotas/specs/entregador-zonas-servico/spec.md" – cenários da zona de serviço
  - "openspec/changes/entregador-rastreio-zonas-rotas/design.md" – D4, zonas sem raio
  - "supabase/migrations/0207_entrega_parceiro_local_checkout.sql" – despacho com exclusividade ao afiliado da loja
---

# PRD 059: Zonas de serviço do entregador

## 1. Contexto

- **Produto/área**: logística do marketplace (Manaus), entrega por afiliado logístico da loja.
- **Estado atual** (verificado no código em 05/10/2026):
  - O despacho automático dá a exclusividade da corrida ao afiliado logístico aprovado na loja, sem saber se ele atende o endereço de entrega.
  - O checkout oferece entrega por parceiro local sempre que a loja tem afiliado logístico aprovado, qualquer que seja o CEP do comprador.
  - Não existe cadastro de onde o entregador atende: nem bairro, nem CEP, nem raio.
- **Problema**: a corrida chega a quem não atende aquele lado da cidade. O entregador recusa ou deixa a exclusividade vencer, o pedido demora e o comprador espera sem saber. No checkout, a opção aparece para endereços que ninguém da loja cobre. Em 30/09/2026, um produto com partida fora de Manaus chegou a mostrar frete de R$ 5.382,60.

## 2. Solução Proposta

### Visão de produto

- O entregador marca os bairros de Manaus (ou prefixos de CEP) onde aceita entregar.
- A corrida só é oferecida em exclusividade a quem atende o destino; se ninguém atende, ela vai para todos, como hoje.
- No checkout, a entrega por parceiro local só aparece quando algum entregador da loja atende o CEP do comprador.
- Quem ainda não cadastrou a zona continua recebendo tudo, para não cortar os entregadores ativos de um dia para o outro.

### Decisões de produto

1. **O próprio entregador define a zona** (premissa P2 aceita pela dona em 05/10/2026). Ele conhece onde roda; a loja não precisa administrar isso.
2. **Zona = lista de bairros de Manaus e/ou prefixos de CEP de 5 dígitos.** Raio em volta de um ponto foi descartado: em Manaus atravessa o Rio Negro e inclui destinos que dependem de balsa.
3. **Sem zona cadastrada = atende tudo.** Preserva quem já entrega hoje; a tela passa a pedir o cadastro.
4. **Ninguém atende o destino = corrida vai para o pool aberto**, nunca trava o pedido.
5. **Polígono desenhado no mapa fica para depois**, se bairro e CEP não bastarem.

### Fora do escopo

- Zona definida pela loja ou pelo admin (decisão 1).
- Preço diferente por zona: o frete continua o das bandas do seller (PRD 056).
- Zonas fora de Manaus. *(premissa, confirme ou corrija)*
- Rota com várias entregas (PRD 060).

## 3. Funcionalidades

### US01: Entregador cadastra onde atende

Como afiliado logístico, quero marcar os bairros e CEPs onde entrego, para só receber corridas que consigo fazer.

**Rules:**
- O entregador escolhe bairros de uma lista fixa dos bairros de Manaus e pode informar prefixos de CEP de 5 dígitos. A lista é a oficial: 64 bairros (Anexo I da Lei Municipal 1.401/2010 mais a Colônia Japonesa, Lei 3.592/2025), em `src/lib/logistica-parceiro/bairros-manaus.ts`.
- Pode combinar bairros e prefixos; não há limite de quantidade.
- Só o próprio entregador altera a sua zona; o admin consegue consultar.
- A tela da área logística avisa quem ainda não tem zona cadastrada.

**Edge cases:**
- Prefixo com menos ou mais de 5 dígitos, ou com letras → recusado com mensagem.
- Mesmo bairro marcado duas vezes → gravado uma vez só.
- Entregador apaga toda a zona → volta a "atende tudo".
- Outra pessoa tenta alterar a zona do entregador → recusado.

### US02: Corrida vai para quem atende o destino

Como seller, quero que a corrida do meu pedido vá direto para um entregador que atende aquele endereço, para a entrega não ficar parada esperando recusa.

**Rules:**
- No despacho, o entregador só recebe a exclusividade se o CEP de destino casa com um prefixo dele ou se o bairro de entrega está na lista dele.
- Entregador sem zona cadastrada continua elegível como hoje.
- Se nenhum entregador aprovado da loja atende o destino, a corrida vai para o pool aberto.

**Edge cases:**
- Bairro do endereço escrito diferente da lista (acento, maiúscula, abreviação) → compara pelo nome normalizado; se não casar, vale o prefixo do CEP.
- Endereço sem bairro → decide só pelo CEP.
- Dois entregadores atendem o destino → vale a regra de escolha que já existe no despacho.

### US03: Checkout só oferece parceiro local onde há cobertura

Como comprador, quero ver a entrega por parceiro local só quando ela realmente atende meu endereço, para não escolher uma opção que vai demorar ou falhar.

**Rules:**
- A opção de parceiro local aparece só se algum entregador elegível da loja atende o CEP de entrega, ou não tem zona cadastrada.
- Sem cobertura, as outras opções de frete continuam como estão.

**Edge cases:**
- Comprador troca o CEP no checkout → a oferta é recalculada.
- Loja sem nenhum afiliado logístico → comportamento atual, sem a opção.

## 4. Fluxo de Negócio

```
Pedido pago com entrega por parceiro local
   │
   ▼
Algum afiliado aprovado da loja atende o destino (bairro ou prefixo de CEP)?
   ├── sim ──▶ exclusividade para ele (regra atual de escolha)
   └── não ──▶ algum afiliado sem zona cadastrada?
                 ├── sim ──▶ exclusividade para ele (comportamento atual)
                 └── não ──▶ pool aberto
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Entregador cadastra bairros e prefixos e vê a zona salva | Sem cadastro não há filtro | Cadastrar, sair, voltar e conferir |
| Prefixo inválido é recusado | Zona errada esconde corrida | Informar "6900" e "69A00" |
| Corrida para destino fora da zona não dá exclusividade ao entregador | É o objetivo da feature | Pedido com CEP fora da zona; conferir quem recebe |
| Entregador sem zona continua recebendo | Não cortar quem já entrega | Pedido com entregador sem zona |
| Destino sem cobertura vai para o pool aberto, sem travar o pedido | Pedido pago nunca pode ficar sem corrida | Pedido com CEP que ninguém atende |
| Checkout esconde parceiro local para CEP sem cobertura | Comprador não escolhe opção que falha | Checkout com CEP fora de todas as zonas |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Corridas cuja exclusividade vence sem aceite | A levantar no banco (corridas com exclusividade vencida ÷ despachadas, últimos 30 dias) | −50% | 60 dias após o Milestone 1 | −20% | Dona |
| Entregadores ativos com zona cadastrada | 0% (não existe hoje) | 80% | 30 dias após o Milestone 1 | 50% | Dona |

## 6. Milestones

### Milestone 1: Entregador recebe só corridas da sua área

**Por que é um marco:** o entregador para de receber corrida que não faz, e o seller vê a corrida aceita mais rápido; anuncia-se como "escolha onde você entrega".

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Cadastro de bairros e prefixos funciona e recusa prefixo inválido
- [ ] Destino fora da zona não dá exclusividade
- [ ] Entregador sem zona continua recebendo
- [ ] Destino sem cobertura vai para o pool aberto

**Aprovador:** dona

### Milestone 2: Checkout oferece parceiro local só onde há cobertura

**Por que é um marco:** o comprador deixa de ver uma opção que não atende o endereço dele.

**Funcionalidades:** US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Checkout esconde parceiro local para CEP sem cobertura e recalcula ao trocar o CEP

**Aprovador:** dona

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Entregador marca zona pequena demais e some do checkout | Médio | Sem zona = atende tudo; tela mostra quantos bairros estão marcados | Pendente |
| Bairro digitado pelo comprador não casa com a lista | Médio | Normalização do nome e, na falta, prefixo do CEP | Pendente |
| Entregadores não cadastram a zona e nada muda | Médio | Aviso na área logística; métrica de adesão | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 056, parceiro local no checkout e entregador elegível | Interna | Fase 1 em produção | Milestone 2 |
| Lista de bairros de Manaus | Externa | Levantada em 06/10/2026 (64 bairros, `bairros-manaus.ts`) | US01 |

## 8. Referências

- [PRD 056](./056-entrega-por-parceiro-local-no-checkout.md): oferta de parceiro local e entregador elegível.
- [PRD 058](./058-rastreio-da-entrega-em-tempo-real.md): PRD irmão (rastreio).
- [Spec OpenSpec de zonas](../../openspec/changes/entregador-rastreio-zonas-rotas/specs/entregador-zonas-servico/spec.md): cenários.

## 9. Registro de Decisões

- **2026-10-02:** dona pediu zonas de serviço no brainstorm do Fleetbase. Motivo: entregador recebendo corrida fora da área dele.
- **2026-10-05:** o entregador define a zona, por bairro ou prefixo de CEP. Motivo: premissa P2 aceita pela dona.
- **2026-10-05:** raio descartado. Motivo: em Manaus atravessa o Rio Negro e mistura destinos com balsa.
- **2026-10-05:** sem zona = atende tudo. Motivo: não cortar entregadores ativos.
- **2026-10-06:** lista de bairros = os 64 oficiais (Lei 1.401/2010, Anexo I, mais Colônia Japonesa da Lei 3.592/2025). Motivo: a dona pediu a lista oficial; a grafia da lei é a mesma que o ViaCEP devolve, então o endereço do checkout casa sem tradução.
- **2026-10-06:** US01 a US03 implementadas (migration 0214). A zona é gravada por uma função que troca a lista inteira; apelidos de bairro ("Parque Dez") valem na tela e no checkout, e no despacho vale o nome normalizado ou o prefixo de CEP. Motivo: o endereço do pedido vem do ViaCEP, que já usa a grafia da lei.
- **Dependências:** 056 porque o filtro atua sobre o entregador elegível e a oferta de parceiro local definidos lá. O 058 não é pressuposto (zonas funcionam sem rastreio).
