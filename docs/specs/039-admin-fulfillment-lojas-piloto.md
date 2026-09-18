---
spec_prd: "043"
spec_us: "01, 02, 03, 04"
status: "implementado"
data: "2026-09-18"
---

# Spec: Gestão do Fulfillment no Admin e Lojas Piloto do CD (PRD 043)

## 1. Visão Geral

Implementação das US01–US04 do PRD 043: abertura controlada do CD para lojas piloto, entrada de mercadoria pelo admin, e visualização do estado do CD.

## 2. Arquitetura

### 2.1 Banco de Dados (0190)

**Tabela `cd_lojas_piloto`**
- `loja_id uuid` (PK): referência a `lojas`; cascata on delete
- `centro_id uuid` (FK): referência a `centros_distribuicao`; cascata on delete
- `criado_em timestamp`: default `now()`
- `criado_por uuid` (FK): referência a `auth.users`; rastro de quem admitiu
- Índice único: `(loja_id, centro_id)` — uma loja por centro
- RLS: `is_admin()` lê/escreve

**Função `produto_centro_recusa_industria()` (alterada de 0179)**
- Antes: recusava todo produto apontado a centro `industria`
- Agora: aceita se `(produto.loja_id, centro.id)` está em `cd_lojas_piloto`, senão recusa
- Mensagem: "A loja não está admitida a usar o CD do Indústria…"

**RPC `admin_cd_registrar_entrada()`**
- Signature: `(p_produto_id uuid, p_centro_id uuid, p_endereco_id uuid, p_quantidade int, p_motivo text) → jsonb`
- Exigências:
  - Apenas `is_admin()` pode chamar
  - `p_quantidade > 0` e `p_motivo not null`
  - `centro_id` do tipo `industria`
  - `endereco_id` existe, pertence ao centro, não bloqueado
  - `produto.loja_id` está admitida no centro (verifica `cd_lojas_piloto`)
- Resultado: insere em `estoque_movimentos` tipo `entrada`, origem `ajuste`, retorna `{ sucesso: true, movimento_id, mensagem }`
- Erro: retorna `{ sucesso: false, erro: mensagem }`

**Validação `cd_lojas_piloto_valida_remocao()` (trigger before delete)**
- Recusa remoção se a loja tem saldo > 0 no centro (medido em `estoque_saldos`)
- Mensagem: "Não é possível remover a loja do programa piloto com saldo no CD…"

### 2.2 Backend

**Server Actions** em `src/app/(admin)/admin/fulfillment/actions.ts`:
- `adicionarLojaPiloto(formData)`: insere em `cd_lojas_piloto`, revalida
- `removerLojaPiloto(formData)`: deleta de `cd_lojas_piloto` (pode disparar validação), revalida
- `registrarEntrada(formData)`: chama RPC `admin_cd_registrar_entrada`, revalida

**Page Handler** em `src/app/(admin)/admin/fulfillment/page.tsx`:
- `force-dynamic`
- Busca centro `industria` (esperado: Manaus)
- Se nenhum, exibe aviso
- Busca em paralelo: `cd_lojas_piloto`, `estoque_enderecos`, `estoque_reservas`, `estoque_saldos`, `estoque_saldos_endereco`
- Passa tudo a `<FulfillmentContent />`

### 2.3 Frontend

**Componentes** em `src/app/(admin)/admin/fulfillment/components/`:
- `FulfillmentContent`: gerencia tabs (Overview, Lojas Admitidas, Registrar Entrada, Paridade & Divergência)
- `CentroInfoSection`: cards de centro, endereço, número de posições, saldo total
- `PosicoesSaldoSection`: tabela de posições com status (ativa/bloqueada) e saldo
- `ReservasAbertasSection`: tabela de reservas abertas (status ativa/confirmada)
- `LojasPilotoSection`: form de adição + tabela de lojas admitidas com botão remover
- `RegistrarEntradaSection`: form de entrada com campos produto, posição, quantidade, motivo
- `DivergenciaSection`: cards de saldo centro/posições/divergência, tabela por produto, explicação

**Menu**: adição em `src/components/admin/Sidebar.tsx` — "/admin/fulfillment" no grupo "Comercial" ao lado de "Entregas"

## 3. Fluxo de Uso

### 3.1 US01: Admitir Loja
1. Admin abre `/admin/fulfillment`
2. Clica aba "Lojas Admitidas"
3. Coloca UUID da loja e clica "Adicionar"
4. Inserção em `cd_lojas_piloto` com `criado_por = auth.uid()` e `criado_em = now()`
5. Tela revalida e mostra a loja na lista

Remoção:
1. Admin clica "Remover" na loja
2. Se há saldo > 0, trigger recusa e exibe mensagem
3. Se saldo = 0, deleta e tela revalida

### 3.2 US02: Registrar Entrada
1. Admin clica aba "Registrar Entrada"
2. Preenche: Produto ID (UUID), Posição (dropdown), Quantidade (int > 0), Motivo (textarea)
3. Clica "Registrar Entrada"
4. Server action chama `admin_cd_registrar_entrada(…)` via RPC
5. RPC valida tudo (loja admitida, centro industria, posição ativa, motivo) e insere lançamento
6. Resultado exibido (sucesso/erro) e tela revalida

### 3.3 US03/US04: Ver Estado do CD
1. Admin abre `/admin/fulfillment` (aba "Visão Geral" é o padrão)
2. Vê:
   - Cards: nome do centro, endereço, nº posições, saldo total
   - Tabela "Posições do Centro": endereco, saldo, status
   - Tabela "Reservas Abertas": pedido, produto, quantidade, status
   - Alerta: divergência esperada = saldo_centro - saldo_posicoes (explicado como lacuna até US04)

Aba "Paridade & Divergência":
1. Cards: saldo centro | soma posições | divergência
2. Tabela "Divergência por Produto": produto | saldo_centro | saldo_posicoes | diferença
3. Produtos com divergência > 0 destacados
4. Explicação: "esperada e temporária até a separação existir"

## 4. Regras de Negócio Implementadas

| Regra | Onde | Detalhes |
|-------|------|----------|
| Só admin admite loja | RLS + action | `is_admin()` em policy e validação na action |
| Só admin registra entrada | RPC | `is_admin()` em `admin_cd_registrar_entrada` |
| Loja não admitida recusada | Função `produto_centro_recusa_industria()` | Consulta `cd_lojas_piloto` na trigger de insert/update de `produto_centros` |
| Entrada sem endereço recusada | RPC + função `estoque_movimento_valida_endereco()` | `if endereco_id is null then raise`; OK só se centro não é industria |
| Remoção com saldo recusada | Trigger `cd_lojas_piloto_valida_remocao()` | Before delete: calcula saldo de `estoque_saldos` e raise se > 0 |
| Motivo obrigatório | RPC | `if motivo is null or empty then raise` |
| Quantidade positiva | RPC + form | Validação min=1 no HTML, `if quantidade <= 0 then raise` no RPC |
| Posição não bloqueada | RPC | Verifica `estoque_enderecos.bloqueado` |
| Paridade do ledger visível | `DivergenciaSection` | Calcula e exibe divergência por produto |

## 5. Critérios de Aceite Testáveis

| Critério | Teste | Esperado |
|----------|-------|----------|
| Produto de loja admitida aponta para CD | Adicionar loja_A, criar produto em loja_A, apontar para centro industria | Sucesso; produto aparece em `produto_centros` |
| Produto de loja não admitida é recusado | Criar produto em loja_B (não admitida), tentar apontar para CD | Erro: "A loja não está admitida…" |
| Entrada sem posição é recusada | RPC com `endereco_id = null` | Erro da função `estoque_movimento_valida_endereco()` |
| Entrada válida aparece no ledger | Registrar 20 un via RPC | `estoque_movimentos` tem 1 linha tipo entrada, `estoque_saldos` soma 20, `estoque_saldos_endereco` tem 20 na posição |
| Remoção com saldo é recusada | Adicionar loja, registrar entrada 10 un, tentar remover | Erro: "Não é possível remover a loja do programa piloto com saldo…" |
| Remoção sem saldo funciona | Entrada 10 un, transferir para outro centro (saída -10), remover loja | Sucesso |
| Só admin acessa tela | Abrir `/admin/fulfillment` com conta seller | 403 ou redirect `/login` |
| Tela mostra divergência | Registrar entrada 20, vender 5 unidades | Tela mostra saldo_centro = 15, saldo_posicoes = 20, divergencia = -5 (esperado) |

## 6. Testes SQL com Rollback

**Setup inicial:**
```sql
begin;
-- Criar centro industria de teste
insert into centros_distribuicao (id, loja_id, nome, tipo)
  values ('test-cd-001', 'test-loja-admin', 'CD Teste', 'industria');

-- Criar posição
insert into estoque_enderecos (id, centro_id, endereco)
  values ('test-pos-001', 'test-cd-001', 'Prateleira 01');

-- Adicionar loja ao piloto
insert into cd_lojas_piloto (loja_id, centro_id, criado_por)
  values ('test-loja-001', 'test-cd-001', 'admin-uid');
```

**Teste 1: Entrada válida**
```sql
select admin_cd_registrar_entrada(
  'prod-123'::uuid,
  'test-cd-001'::uuid,
  'test-pos-001'::uuid,
  20,
  'Entrada de teste 18/09'
);
-- Esperado: sucesso = true

select count(*) from estoque_movimentos
  where produto_id = 'prod-123' and tipo = 'entrada';
-- Esperado: 1

select quantidade from estoque_saldos
  where produto_id = 'prod-123' and centro_id = 'test-cd-001';
-- Esperado: 20
```

**Teste 2: Loja não admitida**
```sql
insert into produtos (id, loja_id, nome, valor, estoque_atual)
  values ('prod-456'::uuid, 'loja-nao-admitida'::uuid, 'Produto', 100, 0);

insert into produto_centros (produto_id, centro_id)
  values ('prod-456'::uuid, 'test-cd-001'::uuid);
-- Esperado: erro da função produto_centro_recusa_industria()

rollback;
```

**Teste 3: Remoção com saldo**
```sql
-- Após entrada de 20 unidades (teste 1)
delete from cd_lojas_piloto
  where loja_id = 'test-loja-001' and centro_id = 'test-cd-001';
-- Esperado: erro do trigger cd_lojas_piloto_valida_remocao()

-- Após limpar com saída de -20:
insert into estoque_movimentos (produto_id, centro_id, endereco_id, quantidade, tipo, origem, motivo, autor)
  values ('prod-123'::uuid, 'test-cd-001'::uuid, 'test-pos-001'::uuid, -20, 'saida', 'ajuste', 'Revert teste', 'admin-uid');

delete from cd_lojas_piloto
  where loja_id = 'test-loja-001' and centro_id = 'test-cd-001';
-- Esperado: sucesso

rollback;
```

## 7. Considerações de Produção

- **Divergência do ledger**: é esperada e documentada até a US04. Não é um erro.
- **Cascatas**: deletar loja do sistema apaga `cd_lojas_piloto` via cascata — comportamento OK.
- **RLS**: `cd_lojas_piloto` só é lida/escrita por admin. Tabelas de estoque usam policies próprias (seller vê da loja dele, etc).
- **Paridade**: a tela calcula divergência em tempo real; não há cálculo pré-computado. Performance OK até milhares de SKUs.

## 8. O Que Ficou de Fora (Fora do Escopo do PRD 043)

- **US03 do PRD 039 (Recebimento formal)**: entrada do admin é substituto. Sai quando fluxo formal existir.
- **US04 do PRD 039 (Separação)**: sem ela, a divergência fica. Será resolvida no PR da US04.
- **Tarifação (PRD 040)**: admitir loja não gera cobrança automática.
- **Painel do seller (US06 do PRD 039)**: não existe aqui. É escopo separado.
- **Transferência entre posições**: não é action na tela; se necessário, usa a RPC genérica de movimentação.

## 9. Materiais de Referência

- PRD 043: Gestão do fulfillment no admin e lojas piloto do CD
- PRD 036: Ledger de estoque multi-local
- PRD 039: Custódia e operação do CD Indústria
- PRD 040: Tarifação da armazenagem
- Migration 0190: `cd_lojas_piloto`, trava alterada, RPC `admin_cd_registrar_entrada`, trigger `cd_lojas_piloto_valida_remocao`
- Spec 039-us04: Separação e expedição (contexto de como a divergência será resolvida)

